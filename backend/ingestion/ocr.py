from typing import Dict, List

from paddleocr import PaddleOCR

_ocr_instance: PaddleOCR | None = None


def _get_ocr() -> PaddleOCR:
    """
    Lazily build the PaddleOCR engine.

    PaddleOCR loads several models from disk on construction, which is
    slow. Doing this at import time means *any* import of this module
    (including for unrelated unit tests, or if a later pipeline step
    fails first) pays that cost. Building it on first use instead keeps
    imports cheap and only pays the cost when OCR is actually needed.
    """
    global _ocr_instance
    if _ocr_instance is None:
        _ocr_instance = PaddleOCR(
            use_textline_orientation=True,
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            lang="en",
        )
    return _ocr_instance


def extract_ocr(image_path: str) -> List[Dict]:
    """
    Returns OCR results as a list of dictionaries.

    Output:
    [
        {
            "text": "...",
            "confidence": 0.99,
            "bbox": [x1, y1, x2, y2],
            "center_x": ...,
            "center_y": ...,
        },
        ...
    ]
    """
    ocr = _get_ocr()
    result = ocr.predict(image_path)

    words = []

    for page in result:
        texts = page["rec_texts"]
        scores = page["rec_scores"]
        boxes = page["rec_boxes"]

        for text, score, box in zip(texts, scores, boxes):
            x1, y1, x2, y2 = map(int, box)

            words.append(
                {
                    "text": text,
                    "confidence": float(score),
                    "bbox": [x1, y1, x2, y2],
                    "center_x": (x1 + x2) / 2,
                    "center_y": (y1 + y2) / 2,
                }
            )

    return words
