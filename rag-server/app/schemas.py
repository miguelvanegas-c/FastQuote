from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Documents ─────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    name: str
    size_bytes: int
    page_count: int
    created_at: datetime


class UploadResponse(BaseModel):
    document: DocumentOut
    chunks_indexed: int
    message: str


# ── Query ─────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    document_id: Optional[str] = None  # restrict search to one doc
    top_k: int = 5


class ChunkResult(BaseModel):
    document_id: str
    content: str
    page_number: Optional[int]
    similarity: float          # score semántico original
    rrf_score: Optional[float] = None   # score de fusión (solo en modo híbrido)
    vector_rank: Optional[int] = None   # posición en ranking vectorial
    lexical_rank: Optional[int] = None  # posición en ranking léxico


class QueryResponse(BaseModel):
    answer: str
    sources: list[ChunkResult]
    retrieval_mode: str = "hybrid"  # "hybrid" | "vector_only" | "lexical_only" | "inventory"
