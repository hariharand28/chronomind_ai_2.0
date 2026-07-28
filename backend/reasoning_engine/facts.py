from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

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
        model: str = "qwen2.5:3b",
        temperature: float = 0.0,
        num_ctx: int = 8192,
    ):

        self.llm = ChatOllama(
            model=model,
            temperature=temperature,
            num_ctx=num_ctx,
            format="json",
        )

        self.chain = PROMPT | self.llm.with_structured_output(FactsOutput)

    def extract(
        self,
        context: ReasoningContext,
    ) -> FactsOutput:

        return self.chain.invoke(
            {
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
