from typing import Dict, List


def parse_layout(words: List[Dict], y_threshold: int = 15) -> List[List[Dict]]:
    """
    Groups OCR words into rows.

    Input:
    [
        {
            "text": "...",
            "confidence": 0.99,
            "bbox": [x1, y1, x2, y2],
            "center_x": 100,
            "center_y": 250
        }
    ]

    Output:
    [
        [ {...}, {...} ],
        [ {...} ],
    ]
    """
    if not words:
        return []

    # Sort top-to-bottom, then left-to-right
    words = sorted(words, key=lambda w: (w["center_y"], w["center_x"]))

    rows: List[Dict] = []

    for word in words:
        wy = word["center_y"]

        # Words are processed in ascending y order, so a match (if any)
        # can only be one of the most-recently-created rows. Scanning
        # from the end avoids walking the full row list for every word,
        # and we pick the CLOSEST matching row (not just the first
        # within threshold) to avoid mis-grouping in dense layouts.
        best_row = None
        best_dist = None

        for row in reversed(rows):
            dist = abs(wy - row["center_y"])
            if dist > y_threshold:
                # Rows are roughly ordered by y; once we're past the
                # threshold going backwards, earlier rows are further
                # away still, so we can stop scanning.
                if best_row is not None:
                    break
                continue
            if best_dist is None or dist < best_dist:
                best_row, best_dist = row, dist

        if best_row is not None:
            best_row["words"].append(word)
            n = len(best_row["words"])
            best_row["center_y"] = (best_row["center_y"] * (n - 1) + wy) / n
        else:
            rows.append({"center_y": wy, "words": [word]})

    # Sort each row left-to-right
    for row in rows:
        row["words"].sort(key=lambda w: w["center_x"])

    # Final rows may have drifted slightly out of y-order due to the
    # running average, so sort them for a stable top-to-bottom output.
    rows.sort(key=lambda r: r["center_y"])

    return [row["words"] for row in rows]


def rows_to_text(rows: List[List[Dict]]) -> List[List[str]]:
    """
    Convert row objects into plain text.

    Output:
    [
        ["Monday", "APT", "DAA"],
        ["Tuesday", "DM", "ML"],
    ]
    """
    return [[word["text"] for word in row] for row in rows]
