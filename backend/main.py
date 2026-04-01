import os
import time
from contextlib import asynccontextmanager

import anthropic
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from auth import create_access_token, verify_password, verify_token
from classifier import classify_prompt
from config import ANTHROPIC_API_KEY, RESPONDER_MODEL
from database import get_audit_log, get_audit_stats, init_db, insert_audit
from decision_engine import apply_decision
from models import AnalyzeRequest, AnalyzeResponse, AuditLogResponse, AuditStats
from users import get_user

_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="SafeGate API", version="1.0.0", lifespan=lifespan)

origins = os.getenv("FRONTEND_URL", "http://localhost:4200").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SafeGate"}


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = get_user(request.username)
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": request.username})
    return TokenResponse(access_token=token, token_type="bearer")


@app.get("/api/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user.get("sub")}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    start = time.monotonic()

    # Step 1: Classify
    classification = await classify_prompt(request.prompt)

    # Step 2: Apply threshold-based decision
    classification = apply_decision(classification)

    # Step 3: Call LLM only if allowed
    llm_response: str | None = None
    if classification.verdict in ("ALLOW", "REWRITE"):
        prompt_for_llm = (
            classification.rewritten_prompt
            if classification.verdict == "REWRITE" and classification.rewritten_prompt
            else request.prompt
        )
        try:
            message = await _client.messages.create(
                model=RESPONDER_MODEL,
                max_tokens=1024,
                system="You are a helpful assistant.",
                messages=[{"role": "user", "content": prompt_for_llm}],
            )
            llm_response = message.content[0].text
        except anthropic.APIError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"LLM responder unavailable: {exc}",
            ) from exc

    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Step 4: Audit log
    categories_for_log = [cat.model_dump() for cat in classification.categories]
    audit_id = await insert_audit(
        original_prompt=request.prompt,
        rewritten_prompt=classification.rewritten_prompt,
        verdict=classification.verdict,
        risk_score=classification.risk_score,
        categories_triggered=categories_for_log,
        llm_response=llm_response,
        processing_time_ms=elapsed_ms,
    )

    return AnalyzeResponse(
        verdict=classification.verdict,
        risk_score=classification.risk_score,
        categories=classification.categories,
        reasoning=classification.reasoning,
        original_prompt=request.prompt,
        rewritten_prompt=classification.rewritten_prompt,
        llm_response=llm_response,
        processing_time_ms=elapsed_ms,
        audit_id=audit_id,
    )


@app.get("/api/audit", response_model=AuditLogResponse)
async def audit_log(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    verdict: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    verdict_filter = verdict if verdict and verdict != "ALL" else None
    return await get_audit_log(page=page, limit=limit, verdict_filter=verdict_filter)


@app.get("/api/audit/stats", response_model=AuditStats)
async def audit_stats(current_user: dict = Depends(get_current_user)):
    return await get_audit_stats()
