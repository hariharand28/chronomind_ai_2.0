from config import DEFAULT_MODEL

from .constraints import ConstraintEngine
from .context import ReasoningContext
from .facts import FactsEngine
from .parser import ReasoningOutput
from .planner import PlannerEngine


class ReasoningEngine:
    """
    ChronoMind Reasoning Pipeline

        ReasoningContext
                │
                ▼
         Facts Engine
                │
                ▼
      Constraint Engine
                │
                ▼
         Planner Engine
                │
                ▼
        ReasoningOutput
    """

    def __init__(
        self,
        facts_model: str = DEFAULT_MODEL,
        planner_model: str = DEFAULT_MODEL,
    ):

        self.facts_engine = FactsEngine(model=facts_model)

        self.constraint_engine = ConstraintEngine(model=facts_model)

        self.planner_engine = PlannerEngine(model=planner_model)

    def run(self, context: ReasoningContext) -> ReasoningOutput:

        print("Running Facts Engine...")
        facts = self.facts_engine.extract(context)
        print("✓ Facts Engine finished")

        print("Running Constraint Engine...")
        constraints = self.constraint_engine.analyze(facts)
        print("✓ Constraint Engine finished")

        # This was previously set on context.metadata by Orchestrator.run()
        # but never actually read by anything, so rejection feedback from
        # /decide silently had zero effect on the regenerated plan.
        rejection_feedback = context.metadata.get("rejection_feedback", "")

        print("Running Planner Engine...")
        plan = self.planner_engine.plan(
            facts,
            constraints,
            rejection_feedback=rejection_feedback,
            current_datetime=context.current_datetime,
        )
        print("✓ Planner Engine finished")

        return plan
