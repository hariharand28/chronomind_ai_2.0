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
        facts_model: str = "qwen3:4b",
        planner_model: str = "deepseek-r1:7b",
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

        print("Running Planner Engine...")
        plan = self.planner_engine.plan(facts, constraints)
        print("✓ Planner Engine finished")

        return plan
