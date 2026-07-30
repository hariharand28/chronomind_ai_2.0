from datetime import datetime
from typing import Any

from ingestion.extractor import Document
from pydantic import BaseModel, Field

# ==========================================================
# EXISTING CALENDAR
# ==========================================================


class CalendarEvent(BaseModel):
    """
    Events already present in the user's calendar.
    """

    title: str

    start_datetime: str = ""

    end_datetime: str = ""

    location: str = ""

    description: str = ""


# ==========================================================
# EXISTING REMINDERS
# ==========================================================


class Reminder(BaseModel):
    """
    Existing reminders created by ChronoMind or the user.
    """

    title: str

    reminder_datetime: str = ""

    notes: str = ""


# ==========================================================
# USER PROFILE
# ==========================================================


class UserPreference(BaseModel):
    """
    Persistent user preferences.
    """

    preferred_study_time: str = ""

    max_session_minutes: int = 60

    break_minutes: int = 15

    preferred_days: list[str] = Field(default_factory=list)

    avoid_days: list[str] = Field(default_factory=list)


# ==========================================================
# REASONING CONTEXT
# ==========================================================


class ReasoningContext(BaseModel):
    """
    Complete context supplied to the reasoning engine.

    The reasoning engine never accesses databases directly.
    Everything it needs is passed through this object.
    """

    # The real-world date/time the request was made, e.g.
    # "Wednesday, 2026-07-29 14:30". Every stage that needs to resolve
    # relative expressions ("tomorrow", "this Friday", "every Wednesday")
    # or decide which day to start scheduling from MUST use this instead
    # of guessing. Defaults to "now" at construction time.
    current_datetime: str = Field(
        default_factory=lambda: datetime.now().strftime("%A, %Y-%m-%d %H:%M")
    )

    # Current user request
    user_text: str = ""

    # Structured documents from ingestion
    documents: list[Document] = Field(default_factory=list)

    # Existing calendar
    calendar_events: list[CalendarEvent] = Field(default_factory=list)

    # Existing reminders
    reminders: list[Reminder] = Field(default_factory=list)

    # Previous accepted/rejected plans or conversation memory
    memory: list[str] = Field(default_factory=list)

    # User preferences
    preferences: UserPreference = Field(default_factory=UserPreference)

    # Optional metadata
    metadata: dict[str, Any] = Field(default_factory=dict)


# ==========================================================
# CONTEXT BUILDER
# ==========================================================


class ContextBuilder:
    """
    Utility class for constructing a valid ReasoningContext.
    """

    @staticmethod
    def build(
        *,
        user_text: str = "",
        documents: list[Document] | None = None,
        calendar_events: list[CalendarEvent] | None = None,
        reminders: list[Reminder] | None = None,
        memory: list[str] | None = None,
        preferences: UserPreference | None = None,
        metadata: dict[str, Any] | None = None,
        current_datetime: str | None = None,
    ) -> ReasoningContext:

        kwargs: dict[str, Any] = dict(
            user_text=user_text.strip(),
            documents=documents or [],
            calendar_events=calendar_events or [],
            reminders=reminders or [],
            memory=memory or [],
            preferences=preferences or UserPreference(),
            metadata=metadata or {},
        )

        if current_datetime:
            kwargs["current_datetime"] = current_datetime

        return ReasoningContext(**kwargs)
