"""FastAPI route handlers."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import database, gemini, inventory, router_agent
from app.pdf_processor import extract_and_chunk
from app.rrf import reciprocal_rank_fusion
from app.schemas import (
    ChunkResult,
    DocumentOut,
    QueryRequest,
    QueryResponse,
    UploadResponse,
)

router = APIRouter()

# ── Upload ────────────────────────────────────────────────────────────────

@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    page_count, page_chunks = extract_and_chunk(pdf_bytes)
    if not page_chunks:
        raise HTTPException(status_code=422, detail="No text could be extracted from the PDF.")

    doc = database.insert_document(
        name=file.filename,
        size_bytes=len(pdf_bytes),
        page_count=page_count,
    )
    doc_id = doc["id"]

    BATCH = 100
    all_rows: list[dict] = []

    for i in range(0, len(page_chunks), BATCH):
        batch = page_chunks[i : i + BATCH]
        texts = [c.content for c in batch]
        embeddings = gemini.embed_texts(texts)
        for chunk, emb in zip(batch, embeddings):
            all_rows.append(
                {
                    "document_id": doc_id,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "embedding": emb,
                }
            )

    database.insert_chunks(all_rows)

    return UploadResponse(
        document=DocumentOut(**doc),
        chunks_indexed=len(all_rows),
        message=f"Successfully indexed {len(all_rows)} chunks from {page_count} pages.",
    )


# ── List documents ────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentOut])
async def list_documents():
    return database.list_documents()


# ── Delete document ───────────────────────────────────────────────────────

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    database.delete_document(document_id)
    return {"message": "Document and its chunks have been deleted."}


# ── Query / RAG Híbrido + Inventario ─────────────────────────────────────

@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # 1. Clasificar intención
    intent = router_agent.classify_intent(req.question)

    # ── Rama inventario ───────────────────────────────────────────────────
    if intent == "inventory":
        try:
            products = await inventory.listar_productos()
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"No se pudo conectar al backend de inventario: {e}",
            )
        answer = router_agent.answer_from_inventory(req.question, products)
        return QueryResponse(
            answer=answer,
            sources=[],
            retrieval_mode="inventory",
        )

    # ── Rama documentos (RAG Híbrido) ─────────────────────────────────────
    candidate_count = req.top_k * 4
    loop = asyncio.get_event_loop()

    query_emb_future = loop.run_in_executor(None, gemini.embed_query, req.question)
    fts_future = loop.run_in_executor(
        None, database.fts_search, req.question, candidate_count, req.document_id
    )

    query_emb = await query_emb_future
    vector_future = loop.run_in_executor(
        None, database.similarity_search, query_emb, candidate_count, req.document_id
    )

    vector_results, lexical_results = await asyncio.gather(vector_future, fts_future)

    if not vector_results and not lexical_results:
        return QueryResponse(
            answer="No encontré información relevante en los documentos.",
            sources=[],
            retrieval_mode="documents",
        )

    fused = reciprocal_rank_fusion(
        vector_results=vector_results,
        lexical_results=lexical_results,
        top_k=req.top_k,
    )

    answer = gemini.generate_answer(req.question, fused)

    sources = [
        ChunkResult(
            document_id=c["document_id"],
            content=c["content"],
            page_number=c.get("page_number"),
            similarity=round(c.get("similarity", 0.0), 4),
            rrf_score=c.get("rrf_score"),
            vector_rank=c.get("vector_rank"),
            lexical_rank=c.get("lexical_rank"),
        )
        for c in fused
    ]

    if vector_results and lexical_results:
        mode = "hybrid"
    elif vector_results:
        mode = "vector_only"
    else:
        mode = "lexical_only"

    return QueryResponse(answer=answer, sources=sources, retrieval_mode=mode)


# ── Health ────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok"}
