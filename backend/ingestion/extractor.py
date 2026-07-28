from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field

SYSTEM_PROMPT = """
You are an information extraction system.

Extract information from the OCR text into the provided Document schema.

The user's request is only additional context.
Use it only to determine what kind of document the user uploaded.

Examples:
- meeting agenda
- project brief
- work schedule

Rules

- Never invent information.
- Never use outside knowledge.
- Use only the OCR text.
- Correct only obvious OCR mistakes.
- Preserve wording whenever possible.
- Leave unknown fields empty.
- Return exactly one valid Document object.
"""


# Replaces ScheduleEntry
class ExtractedEvent(BaseModel):
    title: str = ""
    start_time: str = ""
    end_time: str = ""
    location: str = ""
    recurrence: str = Field(default="", description="e.g., weekly on Mondays")


# Replaces Assignment
class ExtractedTask(BaseModel):
    title: str = ""
    context: str = Field(default="", description="Associated project or subject")
    deadline: str = ""
    priority: str = ""
    description: str = ""


# Replaces GoalPreference
class ExtractedConstraint(BaseModel):
    description: str = Field(default="", description="A rule, preference, or goal")


# Replaces the student-specific Document
class Document(BaseModel):
    document_type: str = ""
    events: list[ExtractedEvent] = Field(default_factory=list)
    tasks: list[ExtractedTask] = Field(default_factory=list)
    constraints: list[ExtractedConstraint] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


# -----------------------------
# Extractor
# -----------------------------


class DocumentExtractor:
    def __init__(self, llm: ChatOllama):

        self.llm = llm.with_structured_output(Document)

        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                (
                    "human",
                    """
User Request:
{user_text}

OCR Document:
{document}
                    """,
                ),
            ]
        )

        self.chain = self.prompt | self.llm

    def extract(
        self,
        document: str,
        user_text: str = "",
    ) -> Document:

        return self.chain.invoke(
            {
                "user_text": user_text,
                "document": document,
            }
        )
