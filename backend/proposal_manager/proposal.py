from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field
from reasoning_engine.parser import CalendarEvent, Reminder


class ScheduledSlot(BaseModel):
    """
    A concrete calendar slot calculated by the deterministic ProposalBuilder.
    """

    title: str
    day: str
    start_time: str
    end_time: str
    duration_minutes: int
    notes: str = ""


class Proposal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: str = ""

    # Notice this is now ScheduledSlot, not ProposedAction
    scheduled_slots: list[ScheduledSlot] = Field(default_factory=list)

    calendar_events: list[CalendarEvent] = Field(default_factory=list)
    reminders: list[Reminder] = Field(default_factory=list)
    explanation: str = ""


class ProposalDecision(BaseModel):
    proposal_id: str
    action: Literal["accept", "reject"]
    proposal: Proposal | None = None
    feedback: str = ""


class ProposalResult(BaseModel):
    status: Literal["accepted", "replan"]
    proposal: Proposal | None = None
    feedback: str = ""
