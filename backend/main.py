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

import asyncio
import json
import os
import tempfile
import time
from datetime import datetime, timedelta

from dateutil import parser as dateutil_parser
import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from google.genai import errors as genai_errors
from langchain_google_genai import ChatGoogleGenerativeAI

from background_manager.monitor import BackgroundManager
from config import DEFAULT_MODEL, GOOGLE_API_KEY
from ingestion.extractor import Document, DocumentExtractor
from ingestion.ocr import extract_text
from orchestration import Orchestrator
from persistence import db
from proposal_manager.manager import ProposalManager
from proposal_manager.proposal import Proposal, ProposalDecision

app = FastAPI(title="ChronoMind AI")

print("[ChronoMind] Build marker: date-aware-scheduling-fix-v2 (2026-07-29)")

db.init_db()

background_manager = BackgroundManager()

# Fan-out for SSE: every connected /notifications/stream client gets its
# own queue; the scan loop below pushes into all of them.
_sse_subscribers: list[asyncio.Queue] = []

BACKGROUND_SCAN_INTERVAL_SECONDS = 30


async def _background_scan_loop() -> None:
    """
    The "Memory watcher" running loop. Polls persistent memory on an
    interval and pushes any newly-created notifications out to connected
    SSE clients. Read-only with respect to proposals/schedule -- see the
    module docstring in background_manager/monitor.py for why.
    """
    while True:
        try:
            new_notifications = background_manager.scan_once()
            for notification in new_notifications:
                for queue in list(_sse_subscribers):
                    queue.put_nowait(notification)
        except Exception as exc:  # noqa: BLE001 - never let the loop die
            print(f"[background_manager] scan error: {exc}")

        await asyncio.sleep(BACKGROUND_SCAN_INTERVAL_SECONDS)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()
    asyncio.create_task(_background_scan_loop())


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


@app.exception_handler(genai_errors.APIError)
async def _genai_error_handler(request, exc: genai_errors.APIError):
    """
    Turns a raw Gemini API error (429 quota, 404 model-not-found, 500
    server error, etc.) into a clean JSON response instead of a raw
    Python traceback reaching the browser. The frontend's chat.tsx
    already displays whatever message comes back here.
    """
    status_code = getattr(exc, "code", None) or 503
    if status_code == 429:
        message = "The AI service is rate-limited right now. Please wait a few seconds and try again."
    elif status_code == 404:
        message = "The configured AI model isn't available. Check DEFAULT_MODEL in config.py."
    else:
        message = f"The AI service returned an error ({status_code}). Please try again."

    return JSONResponse(status_code=503, content={"detail": message})


@app.exception_handler(httpx.TransportError)
async def _transport_error_handler(request, exc: httpx.TransportError):
    """
    Network-level failure talking to Gemini (e.g. 'Server disconnected
    without sending a response') that survived the retry logic in
    ocr.py / extractor.py. Usually transient -- a clean retry-friendly
    message beats a raw traceback.
    """
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Lost connection to the AI service momentarily. Please try again."
        },
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

    if proposal.calendar_events:
        lines.append("")
        lines.append("**Fixed events**")
        for event in proposal.calendar_events:
            when = event.start_datetime
            if event.end_datetime:
                when = f"{when}\u2013{event.end_datetime}"
            lines.append(
                f"- **{event.title}**"
                + (f" ({when})" if when else "")
                + (f" \u2014 {event.description}" if event.description else "")
            )

    if proposal.reminders:
        lines.append("")
        lines.append("**Reminders**")
        for reminder in proposal.reminders:
            lines.append(
                f"- **{reminder.title}**"
                + (f" ({reminder.reminder_datetime})" if reminder.reminder_datetime else "")
                + (f" \u2014 {reminder.notes}" if reminder.notes else "")
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
                calendar_events=[event.model_dump() for event in proposal.calendar_events],
                reminders=[reminder.model_dump() for reminder in proposal.reminders],
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


def _fixed_event_datetime_iso(text: str, reference: datetime) -> str | None:
    """
    Best-effort conversion of a calendar_event's free-text start/end
    (e.g. "Wednesday 17:00", or a full date like "2026-08-01 09:00")
    into a concrete ISO datetime for the calendar UI.
    """
    if not text:
        return None

    for weekday_name in _WEEKDAYS:
        if weekday_name.lower() in text.lower():
            try:
                parsed_time = dateutil_parser.parse(text, fuzzy=True)
            except (ValueError, OverflowError):
                return None
            return _next_occurrence_iso(
                weekday_name, f"{parsed_time.hour:02d}:{parsed_time.minute:02d}", reference
            )

    try:
        return dateutil_parser.parse(text, fuzzy=True, default=reference).isoformat()
    except (ValueError, OverflowError):
        return None


@app.get("/proposal/{proposal_id}")
async def get_proposal(proposal_id: str):
    """
    Returns a single proposal in the clean, stable shape the frontend can
    render straight into a card:

        { "proposal": { "id", "title", "description", "scheduled_slots",
                         "calendar_events", "reminders", "explanation" } }

    Reads straight from SQLite (raw_json column), so this works for any
    proposal that was ever generated -- not just the one currently held
    in the in-memory chat session -- and reflects live status
    ("proposed" / "accepted" / "rejected" / "manual_review").
    """
    row = db.get_proposal(proposal_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    proposal_data = json.loads(row["raw_json"])
    proposal_data["status"] = row["status"]

    return JSONResponse({"proposal": proposal_data})


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

    for event in db.get_committed_calendar_events():
        committed_at = datetime.fromisoformat(event["committed_at"])
        start_iso = _fixed_event_datetime_iso(event["start_datetime"], committed_at)
        end_iso = _fixed_event_datetime_iso(event["end_datetime"], committed_at)

        events.append(
            {
                "id": f"{event['proposal_id']}-{event['title']}-fixed",
                "summary": event["title"],
                "location": event.get("location", ""),
                "start": {"dateTime": start_iso},
                "end": {"dateTime": end_iso},
                "calendarId": "primary",
                "source": "chronomind",
                "notes": event.get("description", ""),
            }
        )

    return JSONResponse({"scheduled_slots": events})


@app.get("/reminders")
async def get_reminders():
    """
    Returns committed reminders shaped to match the frontend's existing
    Reminder type (id, title, notes, due, status, priority, taskListId,
    source) so reminders.tsx can render them with zero UI changes beyond
    swapping its data source. Nothing appears here until an explicit
    accept has happened via /decide -- these come from the same
    accept_proposal() write path as /schedule.
    """
    reminders = [
        {
            "id": str(r["id"]),
            "title": r["title"],
            "notes": r.get("notes") or None,
            "due": r.get("reminder_datetime") or None,
            "status": r["status"],
            "priority": r["priority"],
            "taskListId": "@default",
            "source": "chronomind",
        }
        for r in db.get_committed_reminders()
    ]
    return JSONResponse({"reminders": reminders})


@app.post("/reminders/{reminder_id}/complete")
async def complete_reminder(reminder_id: int):
    db.mark_reminder_status(reminder_id, "completed")
    return JSONResponse({"status": "ok"})


@app.post("/reminders/{reminder_id}/reopen")
async def reopen_reminder(reminder_id: int):
    db.mark_reminder_status(reminder_id, "needsAction")
    return JSONResponse({"status": "ok"})


@app.get("/notifications/stream")
async def notifications_stream():
    """
    SSE publisher, matching the architecture diagram's Background Manager
    box. Streams newly-created notifications in real time as text/event-stream.

    A polling fallback (GET /notifications) also exists -- SSE connections
    can be flaky across corporate proxies / some browser+OS combos, so the
    frontend uses this as the primary path but can fall back to polling
    without losing functionality.
    """
    queue: asyncio.Queue = asyncio.Queue()
    _sse_subscribers.append(queue)

    async def event_generator():
        try:
            # Send anything already undelivered so a freshly-opened tab
            # doesn't miss notifications generated before it connected.
            for notification in db.list_notifications(limit=20):
                if notification["read_at"] is None:
                    yield f"data: {json.dumps(notification)}\n\n"

            while True:
                notification = await queue.get()
                yield f"data: {json.dumps(notification)}\n\n"
        finally:
            _sse_subscribers.remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/notifications")
async def get_notifications(limit: int = 50):
    """Polling fallback -- returns recent notifications, newest first."""
    return JSONResponse({"notifications": db.list_notifications(limit=limit)})


@app.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    db.mark_notification_read(notification_id)
    return JSONResponse({"status": "ok"})


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
