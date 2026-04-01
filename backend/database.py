import json
from datetime import datetime, timezone

import aiosqlite

from config import DB_PATH
from models import AuditEntry, AuditLogResponse, AuditStats

# For production, replace SQLite with PostgreSQL using asyncpg.
# asyncpg connection string pattern:
#   DATABASE_URL = "postgresql+asyncpg://user:password@host:5432/dbname"
# Example with asyncpg directly:
#   conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
# NOTE: Render free tier has ephemeral disk — SQLite data is lost on redeploy.
#       Provision a Render PostgreSQL instance (or Supabase) for persistent storage.


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                original_prompt TEXT NOT NULL,
                rewritten_prompt TEXT,
                verdict TEXT NOT NULL,
                risk_score REAL NOT NULL,
                categories_triggered TEXT NOT NULL,
                llm_response TEXT,
                processing_time_ms INTEGER NOT NULL
            )
        """)
        await db.commit()


async def insert_audit(
    original_prompt: str,
    rewritten_prompt: str | None,
    verdict: str,
    risk_score: float,
    categories_triggered: list[dict],
    llm_response: str | None,
    processing_time_ms: int,
) -> int:
    timestamp = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO audit_log
                (timestamp, original_prompt, rewritten_prompt, verdict,
                 risk_score, categories_triggered, llm_response, processing_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                original_prompt,
                rewritten_prompt,
                verdict,
                risk_score,
                json.dumps(categories_triggered),
                llm_response,
                processing_time_ms,
            ),
        )
        await db.commit()
        return cursor.lastrowid


async def get_audit_log(
    page: int = 1,
    limit: int = 20,
    verdict_filter: str | None = None,
) -> AuditLogResponse:
    offset = (page - 1) * limit

    where_clause = "WHERE verdict = ?" if verdict_filter else ""
    params_filter = [verdict_filter] if verdict_filter else []

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        count_row = await db.execute_fetchall(
            f"SELECT COUNT(*) as cnt FROM audit_log {where_clause}",
            params_filter,
        )
        total = count_row[0]["cnt"]

        rows = await db.execute_fetchall(
            f"""
            SELECT * FROM audit_log {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            params_filter + [limit, offset],
        )

    entries = [AuditEntry(**dict(row)) for row in rows]
    return AuditLogResponse(entries=entries, total=total, page=page, limit=limit)


async def get_audit_stats() -> AuditStats:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        rows = await db.execute_fetchall(
            "SELECT verdict, risk_score, categories_triggered FROM audit_log"
        )

    total = len(rows)
    if total == 0:
        return AuditStats(
            total_requests=0,
            block_rate=0.0,
            rewrite_rate=0.0,
            allow_rate=0.0,
            avg_risk_score=0.0,
            top_categories=[],
        )

    block_count = sum(1 for r in rows if r["verdict"] == "BLOCK")
    rewrite_count = sum(1 for r in rows if r["verdict"] == "REWRITE")
    allow_count = sum(1 for r in rows if r["verdict"] == "ALLOW")
    avg_risk = sum(r["risk_score"] for r in rows) / total

    category_counts: dict[str, int] = {}
    for row in rows:
        try:
            cats = json.loads(row["categories_triggered"])
            for cat in cats:
                if cat.get("triggered"):
                    name = cat["name"]
                    category_counts[name] = category_counts.get(name, 0) + 1
        except (json.JSONDecodeError, KeyError):
            pass

    top_categories = sorted(
        [{"name": k, "count": v} for k, v in category_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    return AuditStats(
        total_requests=total,
        block_rate=round(block_count / total, 4),
        rewrite_rate=round(rewrite_count / total, 4),
        allow_rate=round(allow_count / total, 4),
        avg_risk_score=round(avg_risk, 4),
        top_categories=top_categories,
    )
