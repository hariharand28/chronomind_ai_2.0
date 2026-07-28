from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

from .parser import ConstraintOutput, FactsOutput
from .prompt import CONSTRAINT_SYSTEM_PROMPT, CONSTRAINT_USER_PROMPT

PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", CONSTRAINT_SYSTEM_PROMPT),
        ("human", CONSTRAINT_USER_PROMPT),
    ]
)


class ConstraintEngine:
    """
    Stage 2

    Facts
        ↓
    Constraint Analysis
        ↓
    ConstraintOutput
    """

    def __init__(
        self,
        model: str = "qwen3:4b",
        temperature: float = 0.0,
        num_ctx: int = 4096,
    ):

        self.llm = ChatOllama(
            model=model,
            temperature=temperature,
            num_ctx=num_ctx,
            format="json",
        )

        self.chain = PROMPT | self.llm.with_structured_output(ConstraintOutput)

    def analyze(
        self,
        facts: FactsOutput,
    ) -> ConstraintOutput:

        return self.chain.invoke(
            {
                "facts": facts.model_dump(),
            }
        )
