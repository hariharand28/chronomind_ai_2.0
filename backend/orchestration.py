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
    ):

        print("[EVENT] DocumentCreated")

        context = ContextBuilder.build(
            user_text=user_text,
            documents=[document],
            calendar_events=calendar_events or [],
            reminders=reminders or [],
            memory=memory or [],
            metadata=metadata or {},
        )

        # Optional feedback from a previously rejected proposal.
        # The reasoning engine can decide how to use it.
        if rejection_feedback:
            context.metadata["rejection_feedback"] = rejection_feedback

        print("[EVENT] ReasoningStarted")

        reasoning_output = self.reasoning_engine.run(context)

        print("[EVENT] ReasoningCompleted")

        proposal = ProposalBuilder.build(reasoning_output)

        print("[EVENT] ProposalCreated")

        return proposal
