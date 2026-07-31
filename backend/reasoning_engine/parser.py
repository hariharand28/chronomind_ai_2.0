from typing import Literal

from pydantic import BaseModel, Field

# ==========================================================
# FACT EXTRACTION
# ==========================================================


class Fact(BaseModel):
    """
    A factual piece of information extracted from the context.
    """

    category: Literal[
        "task",
        "deadline",
        "exam",
        "meeting",
        "goal",
        "preference",
        "constraint",
        "other",
    ]

    title: str
    description: str = ""

    date: str = ""
    start_time: str = ""
    end_time: str = ""
    location: str = ""


class FactsOutput(BaseModel):
    """
    Output of the Facts Engine.
    """

    facts: list[Fact] = Field(default_factory=list)

    missing_information: list[str] = Field(default_factory=list)


# ==========================================================
# CONSTRAINT ANALYSIS
# ==========================================================


class Constraint(BaseModel):
    """
    A rule that should influence planning.
    """

    type: Literal["hard", "soft"]

    description: str

    reason: str = ""


class Conflict(BaseModel):
    """
    Conflict detected between facts or constraints.
    """

    title: str

    description: str

    severity: Literal["low", "medium", "high"] = "medium"


class ConstraintOutput(BaseModel):
    """
    Output of the Constraint Engine.
    """

    hard_constraints: list[Constraint] = Field(default_factory=list)

    soft_constraints: list[Constraint] = Field(default_factory=list)

    conflicts: list[Conflict] = Field(default_factory=list)


# ==========================================================
# PLANNING
# ==========================================================


class ProposedAction(BaseModel):
    """
    High-level action.
    The scheduler decides exact calendar slots.
    """

    title: str

    description: str = ""

    priority: Literal[
        "high",
        "medium",
        "low",
    ] = "medium"

    estimated_duration_minutes: int = 0

    constraints: list[str] = Field(default_factory=list)


class CalendarEvent(BaseModel):
    title: str

    start_datetime: str = ""

    end_datetime: str = ""

    location: str = ""

    description: str = ""


class Reminder(BaseModel):
    title: str

    reminder_datetime: str = ""

    notes: str = ""

    priority: Literal["low", "medium", "high"] = "medium"


# ==========================================================
# FINAL OUTPUT
# ==========================================================


class ReasoningOutput(BaseModel):
    """
    Final output produced by the reasoning engine.
    """

    facts: FactsOutput

    constraints: ConstraintOutput

    proposed_actions: list[ProposedAction] = Field(default_factory=list)

    calendar_events: list[CalendarEvent] = Field(default_factory=list)

    reminders: list[Reminder] = Field(default_factory=list)

    summary: str = ""
