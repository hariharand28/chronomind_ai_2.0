from reasoning_engine.parser import ReasoningOutput

from .proposal import Proposal, ScheduledSlot


class ProposalBuilder:
    @staticmethod
    def build(reasoning_output: ReasoningOutput) -> Proposal:
        slots = []

        # --- DETERMINISTIC SCHEDULING ALGORITHM ---

        # 1. Define priority weights for sorting
        priority_weights = {"high": 3, "medium": 2, "low": 1}

        # 2. Sort the proposed actions by priority (highest first)
        # We use .get(..., 0) as a fallback in case the LLM outputs a weird string
        sorted_actions = sorted(
            reasoning_output.proposed_actions,
            key=lambda action: priority_weights.get(action.priority.lower(), 0),
            reverse=True,
        )

        # 3. Setup Calendar Constraints
        available_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        current_day_idx = 0
        current_time = 17 * 60  # Start at 17:00 (5:00 PM) in minutes
        day_end_time = 22 * 60  # End at 22:00 (10:00 PM) in minutes
        max_chunk_size = 60  # Maximum continuous study block
        break_duration = 15  # Mandatory break between blocks

        # 4. Allocate Slots
        for action in sorted_actions:
            remaining_time = action.estimated_duration_minutes

            while remaining_time > 0:
                chunk = min(remaining_time, max_chunk_size)

                # If this chunk pushes us past the daily limit, roll over to the next day
                if current_time + chunk > day_end_time:
                    current_day_idx += 1

                    # Halt scheduling if we run out of available days in the week
                    if current_day_idx >= len(available_days):
                        break

                    current_time = 17 * 60  # Reset to 5:00 PM for the new day

                # Format times (e.g., "17:00")
                start_str = f"{current_time // 60:02d}:{current_time % 60:02d}"
                end_time = current_time + chunk
                end_str = f"{end_time // 60:02d}:{end_time % 60:02d}"

                slots.append(
                    ScheduledSlot(
                        title=action.title,
                        day=available_days[current_day_idx],
                        start_time=start_str,
                        end_time=end_str,
                        duration_minutes=chunk,
                        notes=action.description,
                    )
                )

                # Deduct time and add the mandatory break
                remaining_time -= chunk
                current_time += chunk + break_duration

            # Break the outer loop as well if we've exhausted our week
            if current_day_idx >= len(available_days):
                break

        return Proposal(
            title="Generated Plan",
            scheduled_slots=slots,
            calendar_events=reasoning_output.calendar_events,
            reminders=reasoning_output.reminders,
            explanation=reasoning_output.summary,
        )
