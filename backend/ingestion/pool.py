from extractor import Document
from pydantic import BaseModel, Field


class UnifiedContext(BaseModel):
    user_text: str = ""
    documents: list[Document] = Field(default_factory=list)


class ContextPool:
    @staticmethod
    def build(
        user_text: str = "",
        documents: list[Document] | None = None,
    ) -> UnifiedContext:
        return UnifiedContext(
            user_text=user_text.strip(),
            documents=documents or [],
        )
