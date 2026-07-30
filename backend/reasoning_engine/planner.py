from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from config import DEFAULT_MODEL, GOOGLE_API_KEY

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
        model: str = DEFAULT_MODEL,
        temperature: float = 0.2,
    ):

        self.llm = ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            google_api_key=GOOGLE_API_KEY,
        )

        self.chain = PROMPT | self.llm.with_structured_output(ReasoningOutput)

    def plan(
        self,
        facts: FactsOutput,
        constraints: ConstraintOutput,
        rejection_feedback: str = "",
        current_datetime: str = "",
    ) -> ReasoningOutput:

        return self.chain.invoke(
            {
                "current_datetime": current_datetime or "unknown",
                "facts": facts.model_dump(),
                "constraints": constraints.model_dump(),
                "rejection_feedback": rejection_feedback or "None.",
            }
        )
