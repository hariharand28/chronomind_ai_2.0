"""
background_manager/monitor.py

Implements the "Background Manager" box from the architecture diagram:

    Memory watcher -> Delta Detector -> Event Classifier -> Notification Builder -> SSE publisher

Behavior, matching the design principle from the pitch deck ("User-Initiated
Replan: Background monitoring never autonomously replans -- it notifies the
user with context... User decides whether to trigger replanning"):

- This module ONLY reads from persistent memory (SQLite) and ONLY writes
  notifications. It never modifies proposals, schedules, or triggers a
  replan on its own. It's an observer, not an actor.
- Runs on a periodic scan loop (started from main.py's startup event),
  not tied to any single request.
- Dedupe is handled at the database layer (UNIQUE dedupe_key) so a scan
  running every N seconds doesn't spam the same notification repeatedly.

Two things it watches for (the two "delta" types it classifies):
    1. deadline_approaching -- a task's deadline (from an ingested Document)
       is within the configured warning window.
    2. slot_upcoming -- a committed, accepted schedule slot is about to
       start.
"""

from datetime import datetime, timedelta

from dateutil import parser as date_parser

from persistence import db

DEADLINE_WARNING_HOURS = 48
SLOT_WARNING_MINUTES = 30

_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _try_parse_deadline(raw: str, reference: datetime) -> datetime | None:
    """
    Deadlines come out of the LLM extractor as free-form text ("Friday",
    "next week", "2026-08-01", "Aug 5"). dateutil.parser handles most of
    these; bare weekday names need `reference` to resolve to a concrete
    date (dateutil already does this correctly via default handling, but
    we pass `default=reference` explicitly to be safe/predictable).
    """
    if not raw or not raw.strip():
        return None
    try:
        return date_parser.parse(raw, default=reference, fuzzy=True)
    except (ValueError, OverflowError):
        return None


def _next_occurrence(day_name: str, time_str: str, reference: datetime) -> datetime | None:
    try:
        target_idx = _WEEKDAYS.index(day_name)
    except ValueError:
        return None

    try:
        hour, minute = (int(x) for x in time_str.split(":")[:2])
    except (ValueError, AttributeError):
        return None

    days_ahead = (target_idx - reference.weekday()) % 7
    candidate = (reference + timedelta(days=days_ahead)).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )
    if candidate < reference:
        candidate += timedelta(days=7)
    return candidate


class BackgroundManager:
    """Memory watcher + Delta Detector + Event Classifier + Notification Builder."""

    def scan_once(self, now: datetime | None = None) -> list[dict]:
        """
        Runs one scan pass. Returns the list of NEWLY created notifications
        (empty if nothing new -- most scans will find nothing, which is
        expected, not an error).
        """
        now = now or datetime.now()
        new_notifications: list[dict] = []

        new_notifications.extend(self._scan_deadlines(now))
        new_notifications.extend(self._scan_upcoming_slots(now))

        return new_notifications

    # -- Delta Detector + Event Classifier for deadlines -------------------

    def _scan_deadlines(self, now: datetime) -> list[dict]:
        results = []

        for doc in db.get_all_documents():
            tasks = doc["raw_json"].get("tasks", [])
            for task in tasks:
                deadline_raw = task.get("deadline", "")
                deadline_dt = _try_parse_deadline(deadline_raw, now)
                if deadline_dt is None:
                    continue

                hours_until = (deadline_dt - now).total_seconds() / 3600
                if 0 <= hours_until <= DEADLINE_WARNING_HOURS:
                    title = task.get("title", "Untitled task")
                    dedupe_key = f"deadline:{doc['id']}:{title}:{deadline_raw}"

                    notification = db.save_notification(
                        kind="deadline_approaching",
                        dedupe_key=dedupe_key,
                        title="Deadline approaching",
                        message=f'"{title}" is due {deadline_raw} '
                        f"({int(hours_until)}h from now).",
                        related_id=str(doc["id"]),
                    )
                    if notification:
                        results.append(notification)

        return results

    # -- Delta Detector + Event Classifier for committed schedule slots ----

    def _scan_upcoming_slots(self, now: datetime) -> list[dict]:
        results = []

        for slot in db.get_committed_schedule_raw():
            start_dt = _next_occurrence(slot["day"], slot["start_time"], now)
            if start_dt is None:
                continue

            minutes_until = (start_dt - now).total_seconds() / 60
            if 0 <= minutes_until <= SLOT_WARNING_MINUTES:
                dedupe_key = f"slot:{slot['id']}:{start_dt.date().isoformat()}"

                notification = db.save_notification(
                    kind="slot_upcoming",
                    dedupe_key=dedupe_key,
                    title="Upcoming session",
                    message=f'"{slot["title"]}" starts in {int(minutes_until)} min '
                    f'({slot["start_time"]}).',
                    related_id=str(slot["id"]),
                )
                if notification:
                    results.append(notification)

        return results
