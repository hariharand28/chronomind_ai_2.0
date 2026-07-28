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
import mimetypes

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from config import DEFAULT_MODEL, GOOGLE_API_KEY

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
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type is None:
        mime_type = "image/png"

    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime_type};base64,{data}"


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

    response = llm.invoke([message])
    text = response.content

    if isinstance(text, list):
        # Some providers can return content as a list of parts;
        # join any text parts defensively.
        text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in text
        )

    return text.strip()
