from datetime import datetime
from typing import Any

from ingestion.extractor import Document
from proposal_manager.builder import ProposalBuilder
from reasoning_engine.context import (
    CalendarEvent,
    ContextBuilder,
    Reminder,
)
from reasoning_engine.engine import ReasoningEngine


class Orchestrator:
    """
    ChronoMind Orchestrator

    Pipeline

    Document
        ↓
    ContextBuilder
        ↓
    ReasoningEngine
        ↓
    ProposalBuilder
        ↓
    Proposal
    """

    def __init__(self):

        self.reasoning_engine = ReasoningEngine()

    def run(
        self,
        *,
        document: Document,
        user_text: str,
        rejection_feedback: str | None = None,
        calendar_events: list[CalendarEvent] | None = None,
        reminders: list[Reminder] | None = None,
        memory: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        reference_datetime: datetime | None = None,
    ):

        print("[EVENT] DocumentCreated")

        # The single source of truth for "now". Everything downstream
        # (Facts/Constraint/Planner prompts, and the deterministic
        # ProposalBuilder) is anchored to this same value so the plan
        # actually starts from today instead of assuming Monday.
        now = reference_datetime or datetime.now()

        print(
            f"[ChronoMind:DATE_FIX_ACTIVE] resolved current_datetime = "
            f"{now.strftime('%A, %Y-%m-%d %H:%M')} "
            f"(if you don't see this line in your server logs, the old "
            f"code is still running -- restart the backend process)"
        )

        context = ContextBuilder.build(
            user_text=user_text,
            documents=[document],
            calendar_events=calendar_events or [],
            reminders=reminders or [],
            memory=memory or [],
            metadata=metadata or {},
            current_datetime=now.strftime("%A, %Y-%m-%d %H:%M"),
        )

        # Optional feedback from a previously rejected proposal.
        # The reasoning engine can decide how to use it.
        if rejection_feedback:
            context.metadata["rejection_feedback"] = rejection_feedback

        print("[EVENT] ReasoningStarted")

        reasoning_output = self.reasoning_engine.run(context)

        print("[EVENT] ReasoningCompleted")

        proposal = ProposalBuilder.build(reasoning_output, reference_datetime=now)

        print("[EVENT] ProposalCreated")

        return proposal
