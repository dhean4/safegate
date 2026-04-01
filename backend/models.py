from typing import Literal
from pydantic import BaseModel


class CategoryResult(BaseModel):
    name: str
    score: float
    triggered: bool
    reason: str


class ClassificationResult(BaseModel):
    verdict: Literal["ALLOW", "BLOCK", "REWRITE"]
    risk_score: float
    categories: list[CategoryResult]
    reasoning: str
    rewritten_prompt: str | None


class AnalyzeRequest(BaseModel):
    prompt: str


class AnalyzeResponse(BaseModel):
    verdict: str
    risk_score: float
    categories: list[CategoryResult]
    reasoning: str
    original_prompt: str
    rewritten_prompt: str | None
    llm_response: str | None
    processing_time_ms: int
    audit_id: int


class AuditEntry(BaseModel):
    id: int
    timestamp: str
    original_prompt: str
    rewritten_prompt: str | None
    verdict: str
    risk_score: float
    categories_triggered: str
    llm_response: str | None
    processing_time_ms: int


class AuditLogResponse(BaseModel):
    entries: list[AuditEntry]
    total: int
    page: int
    limit: int


class AuditStats(BaseModel):
    total_requests: int
    block_rate: float
    rewrite_rate: float
    allow_rate: float
    avg_risk_score: float
    top_categories: list[dict]
