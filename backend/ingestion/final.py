import os
import tempfile
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_ollama import ChatOllama

from .cleaner import clean_ocr
from .extractor import DocumentExtractor
from .layout_parser import parse_layout, rows_to_text
from .ocr import extract_ocr

app = FastAPI(title="ChronoMind Ingestion API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:11434",
        "http://localhost:8080",
    ],  # match your dev server port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NUM_CTX = 8192


llm = ChatOllama(
    model="qwen2.5:7b",
    temperature=0,
    num_ctx=NUM_CTX,
)

extractor = DocumentExtractor(llm)


def build_document(image_path: str):

    timings = {}

    t0 = time.perf_counter()
    words = extract_ocr(image_path)
    timings["ocr"] = time.perf_counter() - t0

    t0 = time.perf_counter()
    cleaned = clean_ocr(words)
    timings["clean"] = time.perf_counter() - t0

    t0 = time.perf_counter()
    rows = rows_to_text(parse_layout(cleaned))
    timings["layout"] = time.perf_counter() - t0

    document = "\n".join(" | ".join(row) for row in rows)

    return document, timings


@app.post("/ingest")
async def ingest(
    image: UploadFile | None = File(default=None),
    user_text: str = Form(default=""),
):

    if image is None and not user_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an image or user text.",
        )

    timings = {}

    document = ""

    if image is not None:
        suffix = os.path.splitext(image.filename)[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp:
            temp.write(await image.read())

            temp_path = temp.name

        try:
            document, timings = build_document(temp_path)

        finally:
            os.remove(temp_path)

    t0 = time.perf_counter()

    result = extractor.extract(
        document=document,
        user_text=user_text,
    )

    timings["extract"] = time.perf_counter() - t0

    return JSONResponse(
        {
            "document": result.model_dump(),
            "timings": timings,
        }
    )


from orchestration import Orchestrator

orchestrator = Orchestrator()


@app.post("/chat")
async def chat(
    image: UploadFile | None = File(default=None),
    user_text: str = Form(default=""),
):

    if image is None and not user_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an image or user text.",
        )

    timings = {}

    document = ""

    if image is not None:
        suffix = os.path.splitext(image.filename)[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp:
            temp.write(await image.read())

            temp_path = temp.name

        try:
            document, timings = build_document(temp_path)

        finally:
            os.remove(temp_path)

    t0 = time.perf_counter()

    extracted_document = extractor.extract(
        document=document,
        user_text=user_text,
    )

    timings["extract"] = time.perf_counter() - t0

    proposal = orchestrator.run(
        document=extracted_document,
        user_text=user_text,
    )

    return JSONResponse(
        {
            "proposal": proposal.model_dump(),
            "timings": timings,
        }
    )
