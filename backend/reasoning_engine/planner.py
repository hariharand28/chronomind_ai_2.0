from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

from .parser import (
    ConstraintOutput,
    FactsOutput,
    ReasoningOutput,
)
from .prompt import PLANNER_SYSTEM_PROMPT, PLANNER_USER_PROMPT

PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", PLANNER_SYSTEM_PROMPT),
        (
            "human",
            PLANNER_USER_PROMPT,
        ),
    ]
)


class PlannerEngine:
    """
    Stage 3

    Facts
        +
    Constraints
          │
          ▼
      Planner
          │
          ▼
    ReasoningOutput
    """

    def __init__(
        self,
        model: str = "deepseek-r1:7b",
        temperature: float = 0.2,
        num_ctx: int = 8192,
    ):

        self.llm = ChatOllama(
            model=model,
            temperature=temperature,
            num_ctx=num_ctx,
            format="json",
        )

        self.chain = PROMPT | self.llm.with_structured_output(ReasoningOutput)

    def plan(
        self,
        facts: FactsOutput,
        constraints: ConstraintOutput,
    ) -> ReasoningOutput:

        return self.chain.invoke(
            {
                "facts": facts.model_dump(),
                "constraints": constraints.model_dump(),
            }
        )
