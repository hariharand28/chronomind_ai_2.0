"""
main.py

ChronoMind AI — unified backend.

Replaces the two separate `final.py` apps (ingestion + proposal_manager)
with a single FastAPI app that owns the whole pipeline:

    POST /ingest   -> OCR + extraction only (returns a Document)
    POST /propose  -> Document -> Orchestrator -> Proposal
    POST /decide   -> Accept / Reject a Proposal

Run with:
    cd backend
    uvicorn main:app --reload --port 8000

Requires Ollama running locally with the models referenced in
reasoning_engine/*.py pulled (qwen2.5:3b, qwen3:4b, deepseek-r1:7b, qwen2.5:7b).
"""

import os
import tempfile
import time
from datetime import datetime, timedelta

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_google_genai import ChatGoogleGenerativeAI

from config import DEFAULT_MODEL, GOOGLE_API_KEY
from ingestion.extractor import Document, DocumentExtractor
from ingestion.ocr import extract_text
from orchestration import Orchestrator
from persistence import db
from proposal_manager.manager import ProposalManager
from proposal_manager.proposal import Proposal, ProposalDecision

app = FastAPI(title="ChronoMind AI")

db.init_db()


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # vite dev server
        "http://localhost:8080",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Shared, process-wide instances.
#
# ChatOllama / DocumentExtractor / Orchestrator each build LangChain chains
# and (for Orchestrator) the three reasoning-stage models. Building these
# once at startup avoids re-loading models on every request.
# --------------------------------------------------------------------------

extraction_llm = ChatGoogleGenerativeAI(
    model=DEFAULT_MODEL,
    temperature=0,
    google_api_key=GOOGLE_API_KEY,
)

extractor = DocumentExtractor(extraction_llm)
orchestrator = Orchestrator()

# --------------------------------------------------------------------------
# In-memory pipeline context.
#
# NOTE: this only holds transient working context needed to re-run the
# reasoning pipeline on a rejection (the document + user text that produced
# the CURRENT proposal). It is NOT the source of truth for anything that
# matters — proposals, rejection counts, and committed slots all live in
# SQLite (persistence/db.py) so they survive a server restart. Only this
# short-lived "what am I currently refining" pointer is kept in memory.
# --------------------------------------------------------------------------
_CONTEXT: dict = {
    "current_proposal_id": None,
    "last_document": None,  # Document, needed to re-run propose() on reject
    "last_user_text": "",
}


def _ocr_to_text(image_path: str) -> tuple[str, dict]:
    """
    Runs OCR via Gemini vision (ingestion/ocr.py).

    Previously this chained a local PaddleOCR pass with bbox-based
    clean_ocr() / parse_layout() / rows_to_text() steps. Gemini
    reproduces reading order and table/grid structure directly from
    the image, so that pipeline is no longer needed here.
    """
    timings = {}

    t0 = time.perf_counter()
    document_text = extract_text(image_path)
    timings["ocr"] = time.perf_counter() - t0

    return document_text, timings


@app.post("/ingest")
async def ingest(
    image: UploadFile | None = File(default=None),
    user_text: str = Form(default=""),
):
    """
    OCR + extraction only. Returns a structured Document.
    Use this when you want to show the user what was extracted
    before running the reasoning pipeline.
    """

    if image is None and not user_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an image or user text.",
        )

    timings: dict = {}
    document_text = ""

    if image is not None:
        suffix = os.path.splitext(image.filename)[1]

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(await image.read())
            temp_path = temp.name

        try:
            document_text, timings = _ocr_to_text(temp_path)
        finally:
            os.remove(temp_path)

    t0 = time.perf_counter()
    extracted = extractor.extract(document=document_text, user_text=user_text)
    timings["extract"] = time.perf_counter() - t0

    document_id = db.save_document(
        document_type=extracted.document_type,
        raw_json=extracted.model_dump(),
    )

    return JSONResponse(
        {
            "document": extracted.model_dump(),
            "document_id": document_id,
            "raw_ocr_text": document_text,
            "timings": timings,
        }
    )


@app.post("/chat")
async def chat(
    image: UploadFile | None = File(default=None),
    user_text: str = Form(default=""),
):
    """
    Matches the contract the chat UI (frontend/src/routes/chat.tsx) was
    already built against: multipart form with `user_text` + optional
    `image`, returns { "proposal": UIMessage }, where UIMessage is
    { id, role, parts, createdAt } so it can be appended straight into
    the chat's message list with no frontend changes.

    Internally this is the same pipeline as /propose — ingest (if an
    image is given) -> reasoning -> proposal -> persist -- just with the
    response reshaped for the chat UI instead of returning the raw
    Proposal object.
    """

    if image is None and not user_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an image or user text.",
        )

    document_text = ""

    if image is not None:
        suffix = os.path.splitext(image.filename)[1]

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(await image.read())
            temp_path = temp.name

        try:
            document_text, _ = _ocr_to_text(temp_path)
        finally:
            os.remove(temp_path)

    extracted_document = extractor.extract(
        document=document_text,
        user_text=user_text,
    )

    document_id = None
    if document_text:
        document_id = db.save_document(
            document_type=extracted_document.document_type,
            raw_json=extracted_document.model_dump(),
        )

    proposal = orchestrator.run(
        document=extracted_document,
        user_text=user_text,
    )

    db.save_proposal(
        proposal_id=proposal.id,
        title=proposal.title,
        description=proposal.description,
        explanation=proposal.explanation,
        raw_json=proposal.model_dump(),
        document_id=document_id,
        user_text=user_text,
    )

    _CONTEXT["current_proposal_id"] = proposal.id
    _CONTEXT["last_document"] = extracted_document
    _CONTEXT["last_user_text"] = user_text

    # Render the proposal as chat-message text (markdown), since chat.tsx
    # renders assistant message parts through ReactMarkdown.
    lines = [f"**{proposal.title}**", "", proposal.explanation, ""]
    for slot in proposal.scheduled_slots:
        lines.append(
            f"- **{slot.day}** {slot.start_time}\u2013{slot.end_time}: "
            f"{slot.title} ({slot.duration_minutes} min)"
            + (f" \u2014 {slot.notes}" if slot.notes else "")
        )

    chat_message = {
        "id": proposal.id,
        "role": "assistant",
        "parts": [{"type": "text", "text": "\n".join(lines)}],
        "createdAt": datetime.utcnow().isoformat(),
        # Extra fields the UI doesn't require but are handy if you extend
        # the frontend later to show accept/reject buttons per proposal.
        "proposal_id": proposal.id,
        "raw_proposal": proposal.model_dump(),
    }

    return JSONResponse({"proposal": chat_message})


@app.post("/propose")
async def propose(
    image: UploadFile | None = File(default=None),
    user_text: str = Form(default=""),
):
    """
    Full pipeline: ingest (if an image is given) -> reasoning -> proposal.
    Returns a Proposal with visible reasoning (explanation field).
    """

    if image is None and not user_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an image or user text.",
        )

    timings: dict = {}
    document_text = ""

    if image is not None:
        suffix = os.path.splitext(image.filename)[1]

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(await image.read())
            temp_path = temp.name

        try:
            document_text, timings = _ocr_to_text(temp_path)
        finally:
            os.remove(temp_path)

    t0 = time.perf_counter()
    extracted_document = extractor.extract(
        document=document_text,
        user_text=user_text,
    )
    timings["extract"] = time.perf_counter() - t0

    document_id = None
    if document_text:
        document_id = db.save_document(
            document_type=extracted_document.document_type,
            raw_json=extracted_document.model_dump(),
        )

    t0 = time.perf_counter()
    proposal = orchestrator.run(
        document=extracted_document,
        user_text=user_text,
    )
    timings["reasoning_and_proposal"] = time.perf_counter() - t0

    db.save_proposal(
        proposal_id=proposal.id,
        title=proposal.title,
        description=proposal.description,
        explanation=proposal.explanation,
        raw_json=proposal.model_dump(),
        document_id=document_id,
        user_text=user_text,
    )

    # Remember this so a subsequent /decide reject can trigger refinement.
    _CONTEXT["current_proposal_id"] = proposal.id
    _CONTEXT["last_document"] = extracted_document
    _CONTEXT["last_user_text"] = user_text

    return JSONResponse(
        {
            "proposal": proposal.model_dump(),
            "timings": timings,
        }
    )


@app.post("/decide")
async def decide(decision: ProposalDecision):
    """
    Accept or reject a proposal.

    accept  -> commits the slots (in-memory for now; Phase 2 = SQLite) and
               returns status "accepted".
    reject  -> first rejection: re-runs the reasoning pipeline with the
               feedback injected (one refinement pass) and returns the new
               proposal under status "replan".
               second consecutive rejection: does NOT call the LLM again;
               returns status "manual_review" so the agent stops and a
               human takes over, per the two-pass rejection rule.
    """

    result = ProposalManager.process(decision)

    if result.status == "accepted":
        proposal = result.proposal
        if proposal is not None:
            db.accept_proposal(
                proposal_id=decision.proposal_id,
                scheduled_slots=[slot.model_dump() for slot in proposal.scheduled_slots],
            )

        return JSONResponse({"result": result.model_dump()})

    # status == "replan"
    rejection_count = db.increment_rejection_count(decision.proposal_id)

    if rejection_count >= 2:
        db.mark_manual_review(decision.proposal_id)
        return JSONResponse(
            {
                "result": {
                    "status": "manual_review",
                    "feedback": decision.feedback,
                },
            }
        )

    if _CONTEXT["last_document"] is None:
        raise HTTPException(
            status_code=400,
            detail="No prior proposal context to refine. Call /propose first.",
        )

    refined_proposal: Proposal = orchestrator.run(
        document=_CONTEXT["last_document"],
        user_text=_CONTEXT["last_user_text"],
        rejection_feedback=decision.feedback,
    )

    # Keep the SAME proposal id across a refinement. Previously this
    # kept whatever fresh uuid Proposal's default_factory generated,
    # which reset rejection_count to 0 on every refine (a new row = a
    # new counter) and let /decide loop through unlimited refinement
    # passes instead of stopping after one, per the two-pass rule.
    refined_proposal.id = decision.proposal_id

    db.update_proposal_content(
        proposal_id=refined_proposal.id,
        title=refined_proposal.title,
        description=refined_proposal.description,
        explanation=refined_proposal.explanation,
        raw_json=refined_proposal.model_dump(),
    )

    _CONTEXT["current_proposal_id"] = refined_proposal.id

    return JSONResponse(
        {
            "result": {
                "status": "replan",
                "proposal": refined_proposal.model_dump(),
                "feedback": decision.feedback,
            }
        }
    )


_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _next_occurrence_iso(day_name: str, time_str: str, reference: datetime) -> str:
    """
    Converts a weekday name ("Monday") + "HH:MM" into a concrete ISO
    datetime, anchored to the week containing `reference` (normally the
    slot's committed_at timestamp). Falls back to `reference`'s own date
    if day_name isn't recognized.
    """
    try:
        target_idx = _WEEKDAYS.index(day_name)
    except ValueError:
        target_idx = reference.weekday()

    week_start = reference - timedelta(days=reference.weekday())
    target_date = week_start + timedelta(days=target_idx)

    hour, minute = (int(x) for x in time_str.split(":")[:2])
    return target_date.replace(
        hour=hour, minute=minute, second=0, microsecond=0
    ).isoformat()


@app.get("/schedule")
async def get_schedule():
    """
    Returns committed slots reshaped into the CalendarEvent format the
    frontend calendar route already renders (start.dateTime / end.dateTime),
    read directly from SQLite. Nothing appears here until an explicit
    accept has happened via /decide.
    """
    events = []

    for slot in db.get_committed_schedule():
        committed_at = datetime.fromisoformat(slot["committed_at"])

        events.append(
            {
                "id": f"{slot['proposal_id']}-{slot['title']}-{slot['day']}",
                "summary": slot["title"],
                "location": "",
                "start": {
                    "dateTime": _next_occurrence_iso(
                        slot["day"], slot["start_time"], committed_at
                    )
                },
                "end": {
                    "dateTime": _next_occurrence_iso(
                        slot["day"], slot["end_time"], committed_at
                    )
                },
                "calendarId": "primary",
                "source": "chronomind",
                "notes": slot.get("notes", ""),
            }
        )

    return JSONResponse({"scheduled_slots": events})


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
