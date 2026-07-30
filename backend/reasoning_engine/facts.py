from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from config import DEFAULT_MODEL, GOOGLE_API_KEY

from .context import ReasoningContext
from .parser import FactsOutput
from .prompt import FACTS_SYSTEM_PROMPT, FACTS_USER_PROMPT

PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", FACTS_SYSTEM_PROMPT),
        (
            "human",
            FACTS_USER_PROMPT,
        ),
    ]
)


class FactsEngine:
    """
    Stage 1 of the reasoning pipeline.

    Responsibility:
        Extract factual information only.

    Input:
        ReasoningContext

    Output:
        FactsOutput
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

        self.chain = PROMPT | self.llm.with_structured_output(FactsOutput)

    def extract(
        self,
        context: ReasoningContext,
    ) -> FactsOutput:

        return self.chain.invoke(
            {
                "current_datetime": context.current_datetime,
                "user_text": context.user_text,
                "documents": [doc.model_dump() for doc in context.documents],
                "calendar_events": [
                    event.model_dump() for event in context.calendar_events
                ],
                "reminders": [reminder.model_dump() for reminder in context.reminders],
                "memory": context.memory,
                "preferences": context.preferences.model_dump(),
            }
        )
