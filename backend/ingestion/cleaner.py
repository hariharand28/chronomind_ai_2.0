import re

# Compile once at import time instead of on every call.
_WHITESPACE_RE = re.compile(r"\s+")
_ALNUM_RE = re.compile(r"[A-Za-z0-9]")
_REPEATED_CHAR_RE = re.compile(r"(.)\1{4,}")


def normalize(text: str) -> str:
    """Normalize whitespace."""
    return _WHITESPACE_RE.sub(" ", text).strip()


def is_noise(text: str) -> bool:
    """Generic OCR noise detection."""
    if not text:
        return True

    # Ignore strings containing only punctuation/symbols
    if not _ALNUM_RE.search(text):
        return True

    # Ignore extremely long repeated characters
    if _REPEATED_CHAR_RE.fullmatch(text):
        return True

    return False


def clean_ocr(words, confidence_threshold: float = 0.75):
    """
    Clean OCR output without any document-specific rules.

    Input:
    [
        {
            "text": "...",
            "confidence": 0.98,
            "bbox": [...],
            "center_x": ...,
            "center_y": ...
        }
    ]
    """
    cleaned = []

    for word in words:
        if word["confidence"] < confidence_threshold:
            continue

        text = normalize(word["text"])

        if is_noise(text):
            continue

        cleaned.append({**word, "text": text})

    return cleaned
