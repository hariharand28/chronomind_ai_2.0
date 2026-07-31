"""
ocr.py

Document text extraction via Gemini's multimodal vision capabilities,
replacing the previous local PaddleOCR pipeline.

Why this exists: PaddleOCR required a heavy local model stack (paddle,
paddlex, paddleocr) that was slow on CPU and hit a Windows-specific
oneDNN/PIR compatibility crash. Since the rest of this project already
calls Gemini for extraction and reasoning, sending the document image
straight to Gemini removes an entire local inference pipeline and its
dependencies.

This module intentionally returns plain, already-ordered text rather
than a per-word bounding-box list. Gemini reads the image as a whole
and reproduces its reading order directly, so the old bbox-based
clean_ocr() / parse_layout() / rows_to_text() steps are no longer
needed for this path (Gemini effectively does that layout
reconstruction internally, guided by the prompt below).
"""

import base64
import io

import httpx
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import DEFAULT_MODEL, GOOGLE_API_KEY

# Transient network failures worth retrying (e.g. "Server disconnected
# without sending a response" -- httpx.RemoteProtocolError -- or a
# dropped connection/timeout). Genuine API errors like a 429 quota or
# 404 model-not-found are NOT retried here since retrying won't fix
# them; those come back as google.genai.errors.ClientError, not a
# transport-level exception.
_RETRYABLE_EXCEPTIONS = (httpx.TransportError, ConnectionError, TimeoutError)

MAX_IMAGE_DIMENSION = 2000  # px, longest side

_OCR_PROMPT = (
    "You are an OCR engine. Extract ALL text visible in this document "
    "image, exactly as written, preserving reading order.\n\n"
    "Rules:\n"
    "- Preserve the visual layout using plain text: keep rows and "
    "columns roughly aligned, use ' | ' to separate columns within a "
    "row when the document has a table/grid structure.\n"
    "- Do not summarize, translate, correct spelling, or add "
    "commentary.\n"
    "- Do not wrap the output in markdown code fences or quotes.\n"
    "- If the image contains no readable text, return an empty string."
)

_ocr_llm: ChatGoogleGenerativeAI | None = None


def _get_ocr_llm() -> ChatGoogleGenerativeAI:
    """
    Lazily build the Gemini client used for OCR.

    Kept separate from the extraction/reasoning LLM instances in
    main.py so OCR can use its own temperature/model settings
    independently (e.g. if a cheaper/faster vision-capable model is
    preferred for OCR versus reasoning).
    """
    global _ocr_llm
    if _ocr_llm is None:
        _ocr_llm = ChatGoogleGenerativeAI(
            model=DEFAULT_MODEL,
            temperature=0,
            google_api_key=GOOGLE_API_KEY,
        )
    return _ocr_llm


def _encode_image(image_path: str) -> str:
    """
    Downscales large images before sending to Gemini. A full-resolution
    phone photo can be several MB; shrinking the longest side to
    MAX_IMAGE_DIMENSION meaningfully reduces upload time and the chance
    of a mid-transfer network disconnect, with no real accuracy cost
    for OCR (Gemini doesn't need more resolution than this to read text).
    """
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        if max(img.size) > MAX_IMAGE_DIMENSION:
            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        data = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return f"data:image/jpeg;base64,{data}"


@retry(
    retry=retry_if_exception_type(_RETRYABLE_EXCEPTIONS),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
def _invoke_with_retry(llm: ChatGoogleGenerativeAI, message: HumanMessage):
    """
    Retries transient network failures (e.g. a dropped connection
    mid-request) up to 3 times with exponential backoff. Genuine API
    errors (quota, bad model name, etc.) are not transport-level
    exceptions and pass straight through -- retrying those would just
    waste 3x the time before failing the same way.
    """
    return llm.invoke([message])


def extract_text(image_path: str) -> str:
    """
    Runs OCR on the given image path via Gemini and returns the
    extracted text as a single string, already in reading order.

    Replaces the old extract_ocr() + clean_ocr() + parse_layout() +
    rows_to_text() pipeline; this single call does the equivalent job.
    """
    llm = _get_ocr_llm()
    image_data_url = _encode_image(image_path)

    message = HumanMessage(
        content=[
            {"type": "text", "text": _OCR_PROMPT},
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]
    )

    response = _invoke_with_retry(llm, message)
    text = response.content

    if isinstance(text, list):
        # Some providers can return content as a list of parts;
        # join any text parts defensively.
        text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in text
        )

    return text.strip()
