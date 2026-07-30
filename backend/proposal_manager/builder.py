from datetime import date, datetime, timedelta

from dateutil import parser as dateutil_parser
from reasoning_engine.parser import ReasoningOutput

from .proposal import Proposal, ScheduledSlot

WEEKDAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


class ProposalBuilder:
    @staticmethod
    def build(
        reasoning_output: ReasoningOutput,
        reference_datetime: datetime | None = None,
    ) -> Proposal:
        """
        Deterministically turns the LLM's `proposed_actions` (flexible,
        freely-schedulable work) into concrete time slots.

        Anything with a fixed day/time (recurring labs, exams, meetings)
        should already have arrived as `reasoning_output.calendar_events`
        from the Planner -- this builder never re-times those, it only
        makes sure it doesn't stack a proposed action on top of one.
        """

        now = reference_datetime or datetime.now()

        slots: list[ScheduledSlot] = []

        # 1. Priority weights for sorting proposed actions (highest first)
        priority_weights = {"high": 3, "medium": 2, "low": 1}
        sorted_actions = sorted(
            reasoning_output.proposed_actions,
            key=lambda action: priority_weights.get(action.priority.lower(), 0),
            reverse=True,
        )

        # 2. Scheduling window: weekdays only, starting from TODAY's real
        # weekday (not hardcoded to Monday), rolling forward as many
        # calendar days as needed.
        allowed_weekday_names = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
        max_days_ahead = 21  # generous window so we never run out mid-plan

        available_days: list[date] = []
        for offset in range(max_days_ahead):
            d = (now + timedelta(days=offset)).date()
            if WEEKDAY_NAMES[d.weekday()] in allowed_weekday_names:
                available_days.append(d)

        day_start_time = 17 * 60  # 17:00 in minutes
        day_end_time = 22 * 60  # 22:00 in minutes
        max_chunk_size = 60  # maximum continuous work block
        break_duration = 15  # mandatory break between blocks

        # 3. Existing fixed commitments (e.g. a recurring Wednesday lab, an
        # exam, an appointment) that proposed actions must not collide with.
        busy_by_day = ProposalBuilder._collect_busy_intervals(
            reasoning_output.calendar_events, available_days
        )

        current_day_idx = 0

        # If today is a valid scheduling day but the working window
        # (17:00-22:00) has already partly/fully passed, start later
        # today (or roll to the next available day) instead of always
        # resetting to 17:00 on day 0 regardless of the actual time.
        if available_days and available_days[0] == now.date():
            now_minutes = now.hour * 60 + now.minute
            current_time = max(day_start_time, now_minutes)
            if current_time >= day_end_time:
                current_day_idx = 1
                current_time = day_start_time
        else:
            current_time = day_start_time

        def advance_past_conflicts(day_idx: int, start_minutes: int, chunk: int) -> int:
            """Push start_minutes forward past any busy interval it overlaps."""
            if day_idx >= len(available_days):
                return start_minutes
            day = available_days[day_idx]
            moved = True
            while moved:
                moved = False
                for busy_start, busy_end in busy_by_day.get(day, []):
                    if start_minutes < busy_end and start_minutes + chunk > busy_start:
                        start_minutes = busy_end + break_duration
                        moved = True
            return start_minutes

        # 4. Allocate slots for each flexible action.
        for action in sorted_actions:
            remaining_time = action.estimated_duration_minutes

            while remaining_time > 0:
                if current_day_idx >= len(available_days):
                    break

                chunk = min(remaining_time, max_chunk_size)

                current_time = advance_past_conflicts(
                    current_day_idx, current_time, chunk
                )

                # If this chunk (after conflict-avoidance) pushes us past
                # the daily limit, roll over to the next day.
                if current_time + chunk > day_end_time:
                    current_day_idx += 1
                    if current_day_idx >= len(available_days):
                        break
                    current_time = day_start_time
                    current_time = advance_past_conflicts(
                        current_day_idx, current_time, chunk
                    )

                day_date = available_days[current_day_idx]
                start_str = f"{current_time // 60:02d}:{current_time % 60:02d}"
                end_time = current_time + chunk
                end_str = f"{end_time // 60:02d}:{end_time % 60:02d}"

                slots.append(
                    ScheduledSlot(
                        title=action.title,
                        day=WEEKDAY_NAMES[day_date.weekday()],
                        start_time=start_str,
                        end_time=end_str,
                        duration_minutes=chunk,
                        notes=action.description,
                    )
                )

                remaining_time -= chunk
                current_time += chunk + break_duration

            if current_day_idx >= len(available_days):
                break

        # 5. Sort everything chronologically (by actual date, then time) so
        # the plan reads in the order the user will actually experience it,
        # rather than in "priority bucket" order.
        def slot_sort_key(slot: ScheduledSlot):
            # Recover the actual date for this slot's weekday from the
            # window we built.
            for d in available_days:
                if WEEKDAY_NAMES[d.weekday()] == slot.day:
                    return (d, slot.start_time)
            return (date.max, slot.start_time)

        slots.sort(key=slot_sort_key)

        sorted_calendar_events = ProposalBuilder._sort_calendar_events(
            reasoning_output.calendar_events, now
        )

        return Proposal(
            title="Generated Plan",
            scheduled_slots=slots,
            calendar_events=sorted_calendar_events,
            reminders=reasoning_output.reminders,
            explanation=reasoning_output.summary,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _collect_busy_intervals(calendar_events, available_days: list[date]):
        """
        Best-effort extraction of (start_minute, end_minute) busy windows
        per date from the Planner's calendar_events, so the free-time
        scheduler for proposed_actions doesn't stack work on top of a
        fixed commitment (e.g. a recurring weekly lab).

        calendar_events use free-text start_datetime/end_datetime strings,
        so parsing is best-effort: entries that can't be parsed are simply
        skipped (never crash the pipeline over a formatting quirk).
        """
        busy_by_day: dict[date, list[tuple[int, int]]] = {d: [] for d in available_days}
        weekday_to_dates: dict[str, list[date]] = {}
        for d in available_days:
            weekday_to_dates.setdefault(WEEKDAY_NAMES[d.weekday()], []).append(d)

        for event in calendar_events:
            start_raw = (event.start_datetime or "").strip()
            end_raw = (event.end_datetime or "").strip()
            if not start_raw or not end_raw:
                continue

            # Case 1: a bare/recurring weekday name (e.g. "Wednesday 17:00"
            # or just "Wednesday") -- applies to every matching date in the
            # window (that's what "every Wednesday" means).
            matched_weekday = None
            for weekday_name in WEEKDAY_NAMES:
                if weekday_name.lower() in start_raw.lower():
                    matched_weekday = weekday_name
                    break

            start_minutes = ProposalBuilder._parse_time_to_minutes(start_raw)
            end_minutes = ProposalBuilder._parse_time_to_minutes(end_raw)

            if start_minutes is None or end_minutes is None:
                continue

            if matched_weekday:
                for d in weekday_to_dates.get(matched_weekday, []):
                    busy_by_day[d].append((start_minutes, end_minutes))
                continue

            # Case 2: a full parseable date+time -- applies to that one date.
            try:
                parsed_start = dateutil_parser.parse(start_raw, fuzzy=True)
            except (ValueError, OverflowError):
                continue

            event_date = parsed_start.date()
            if event_date in busy_by_day:
                busy_by_day[event_date].append((start_minutes, end_minutes))

        return busy_by_day

    @staticmethod
    def _parse_time_to_minutes(text: str) -> int | None:
        try:
            parsed = dateutil_parser.parse(text, fuzzy=True)
            return parsed.hour * 60 + parsed.minute
        except (ValueError, OverflowError):
            return None

    @staticmethod
    def _sort_calendar_events(calendar_events, now: datetime):
        def key(event):
            for candidate in (event.start_datetime, event.end_datetime):
                if not candidate:
                    continue
                try:
                    return dateutil_parser.parse(candidate, fuzzy=True, default=now)
                except (ValueError, OverflowError):
                    continue
            return datetime.max

        return sorted(calendar_events, key=key)
