"""Supabase helpers – documents & chunks CRUD + vector search + FTS."""

from __future__ import annotations

from typing import Any

from supabase import create_client, Client

from app.config import get_settings

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = create_client(s.supabase_url, s.supabase_service_key)
    return _client


# ── Documents ─────────────────────────────────────────────────────────────

def insert_document(name: str, size_bytes: int, page_count: int) -> dict:
    db = get_client()
    row = {"name": name, "size_bytes": size_bytes, "page_count": page_count}
    res = db.table("documents").insert(row).execute()
    return res.data[0]


def list_documents() -> list[dict]:
    db = get_client()
    res = (
        db.table("documents")
        .select("id, name, size_bytes, page_count, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


def delete_document(document_id: str) -> None:
    db = get_client()
    db.table("documents").delete().eq("id", document_id).execute()


# ── Chunks ────────────────────────────────────────────────────────────────

def insert_chunks(chunks: list[dict]) -> None:
    """
    Each chunk dict must have:
      document_id, content, page_number, chunk_index, embedding (list[float])
    """
    db = get_client()
    # Supabase Python client accepts list of dicts directly
    db.table("chunks").insert(chunks).execute()


# ── Vector search ─────────────────────────────────────────────────────────

def similarity_search(
    query_embedding: list[float],
    match_count: int = 5,
    document_id: str | None = None,
) -> list[dict]:
    """Call the match_chunks RPC defined in the migration SQL."""
    db = get_client()
    params: dict[str, Any] = {
        "query_embedding": query_embedding,
        "match_count": match_count,
    }
    if document_id:
        params["filter_doc_id"] = document_id

    res = db.rpc("match_chunks", params).execute()
    return res.data


# ── Full-text search (léxico / BM25) ──────────────────────────────────────

def fts_search(
    query_text: str,
    match_count: int = 20,
    document_id: str | None = None,
) -> list[dict]:
    """
    Búsqueda léxica usando el RPC match_chunks_fts.
    Devuelve chunks ordenados por ts_rank_cd desc.
    Pedimos el doble de top_k para darle más candidatos al RRF.
    """
    db = get_client()
    params: dict[str, Any] = {
        "query_text": query_text,
        "match_count": match_count,
    }
    if document_id:
        params["filter_doc_id"] = document_id

    try:
        res = db.rpc("match_chunks_fts", params).execute()
        return res.data
    except Exception:
        # Si FTS no encuentra nada o falla (query inválida), devuelve lista vacía
        return []
