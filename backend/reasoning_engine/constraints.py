from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from config import DEFAULT_MODEL, GOOGLE_API_KEY

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
        model: str = DEFAULT_MODEL,
        temperature: float = 0.0,
    ):

        self.llm = ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            google_api_key=GOOGLE_API_KEY,
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
