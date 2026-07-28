"""
persistence/db.py

SQLite persistence layer for ChronoMind AI.

This is the "Persistent Memory as Ground Truth" component from the
architecture diagram. Rules it enforces:

- The reasoning engine and LLM NEVER write here directly. Only
  ProposalManager-approved (accepted) results get committed.
- A proposal exists in the `proposals` table the moment it's generated
  (status="proposed"), so there's a full audit trail of what was shown
  to the user — but only accepted slots ever land in `scheduled_slots`,
  which is what /schedule reads from.
- Rejections are tracked per-proposal so the two-pass rejection rule
  (refine once, then escalate to manual review) survives a server
  restart instead of living in a process-memory dict.

Uses stdlib sqlite3 only — no ORM, no extra dependency, matches the
"zero heavy infrastructure" feasibility claim in the pitch deck.
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "chronomind.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    explanation TEXT,
    raw_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed',
    rejection_count INTEGER NOT NULL DEFAULT 0,
    document_id INTEGER,
    user_text TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS scheduled_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT,
    committed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id)
);
"""


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------------


def save_document(document_type: str, raw_json: dict) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO documents (document_type, raw_json) VALUES (?, ?)",
            (document_type, json.dumps(raw_json)),
        )
        return cur.lastrowid


# --------------------------------------------------------------------------
# Proposals
# --------------------------------------------------------------------------


def save_proposal(
    proposal_id: str,
    title: str,
    description: str,
    explanation: str,
    raw_json: dict,
    document_id: int | None,
    user_text: str,
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO proposals
                (id, title, description, explanation, raw_json, document_id, user_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proposal_id,
                title,
                description,
                explanation,
                json.dumps(raw_json),
                document_id,
                user_text,
            ),
        )


def update_proposal_content(
    proposal_id: str,
    title: str,
    description: str,
    explanation: str,
    raw_json: dict,
) -> None:
    """
    Overwrites an existing proposal row's content in place, keeping its
    id and rejection_count intact.

    Used when refining a rejected proposal: the refinement replaces
    what the user sees under the SAME proposal id, so rejection_count
    keeps accumulating on that id and the two-pass rejection rule
    (refine once, then escalate to manual review) actually triggers.
    Previously each refinement saved as a brand-new row with a fresh
    id, which reset rejection_count to 0 every time and let rejections
    loop indefinitely instead of stopping after one refinement pass.
    """
    with _connect() as conn:
        conn.execute(
            """
            UPDATE proposals
            SET title = ?,
                description = ?,
                explanation = ?,
                raw_json = ?,
                status = 'proposed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                title,
                description,
                explanation,
                json.dumps(raw_json),
                proposal_id,
            ),
        )


def get_proposal(proposal_id: str) -> sqlite3.Row | None:
    with _connect() as conn:
        cur = conn.execute(
            "SELECT * FROM proposals WHERE id = ?",
            (proposal_id,),
        )
        return cur.fetchone()


def increment_rejection_count(proposal_id: str) -> int:
    """Increments and returns the new rejection count for this proposal."""
    with _connect() as conn:
        conn.execute(
            """
            UPDATE proposals
            SET rejection_count = rejection_count + 1,
                status = 'rejected',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (proposal_id,),
        )
        cur = conn.execute(
            "SELECT rejection_count FROM proposals WHERE id = ?",
            (proposal_id,),
        )
        row = cur.fetchone()
        return row["rejection_count"] if row else 0


def mark_manual_review(proposal_id: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE proposals
            SET status = 'manual_review', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (proposal_id,),
        )


def accept_proposal(proposal_id: str, scheduled_slots: list[dict]) -> None:
    """
    Marks a proposal accepted and commits its slots to scheduled_slots.
    This is the ONLY path that writes to scheduled_slots — the table
    /schedule reads from. Nothing gets here without this explicit call,
    which main.py only invokes on an "accept" decision.
    """
    with _connect() as conn:
        conn.execute(
            """
            UPDATE proposals
            SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (proposal_id,),
        )
        for slot in scheduled_slots:
            conn.execute(
                """
                INSERT INTO scheduled_slots
                    (proposal_id, title, day, start_time, end_time, duration_minutes, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    proposal_id,
                    slot["title"],
                    slot["day"],
                    slot["start_time"],
                    slot["end_time"],
                    slot["duration_minutes"],
                    slot.get("notes", ""),
                ),
            )


# --------------------------------------------------------------------------
# Schedule (read model)
# --------------------------------------------------------------------------


def get_committed_schedule() -> list[dict]:
    with _connect() as conn:
        cur = conn.execute(
            "SELECT title, day, start_time, end_time, duration_minutes, notes, proposal_id, committed_at "
            "FROM scheduled_slots ORDER BY committed_at ASC"
        )
        return [dict(row) for row in cur.fetchall()]
