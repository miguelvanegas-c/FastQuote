"""
Reciprocal Rank Fusion (RRF)
============================
Fusiona los rankings de búsqueda vectorial y léxica en una sola lista.

Fórmula:  rrf_score(chunk) = 1/(k + rank_vector) + 1/(k + rank_lexical)

k=60 es el valor estándar de la literatura (Cormack et al., 2009).
Chunks que aparecen bien rankeados en AMBAS búsquedas suben al tope.
"""

from __future__ import annotations

RRF_K = 60  # constante estándar


def reciprocal_rank_fusion(
    vector_results: list[dict],
    lexical_results: list[dict],
    top_k: int = 5,
) -> list[dict]:
    """
    Parámetros
    ----------
    vector_results : lista de chunks de similarity_search, ordenados por similitud desc.
                     Cada dict debe tener al menos: id, document_id, content,
                     page_number, similarity.
    lexical_results: lista de chunks de fts_search, ordenados por rank desc.
                     Cada dict debe tener al menos: id, document_id, content,
                     page_number, rank.
    top_k          : cuántos chunks devolver después de la fusión.

    Devuelve
    --------
    Lista de chunks ordenados por rrf_score desc, enriquecidos con:
      - rrf_score      : puntuación final de fusión
      - vector_rank    : posición en resultados vectoriales (None si no apareció)
      - lexical_rank   : posición en resultados léxicos (None si no apareció)
      - similarity     : score semántico original (0.0 si no apareció)
    """
    scores: dict[str, float] = {}
    meta: dict[str, dict] = {}  # id → datos del chunk

    # ── Ranking vectorial ──────────────────────────────────────────────────
    for rank, chunk in enumerate(vector_results, start=1):
        cid = chunk["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (RRF_K + rank)
        meta[cid] = {
            **chunk,
            "vector_rank": rank,
            "lexical_rank": None,
            "similarity": chunk.get("similarity", 0.0),
        }

    # ── Ranking léxico ─────────────────────────────────────────────────────
    for rank, chunk in enumerate(lexical_results, start=1):
        cid = chunk["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (RRF_K + rank)
        if cid in meta:
            meta[cid]["lexical_rank"] = rank
        else:
            meta[cid] = {
                **chunk,
                "vector_rank": None,
                "lexical_rank": rank,
                "similarity": 0.0,
            }

    # ── Ordenar y devolver top-k ───────────────────────────────────────────
    sorted_ids = sorted(scores, key=lambda i: scores[i], reverse=True)[:top_k]

    result = []
    for cid in sorted_ids:
        chunk = meta[cid].copy()
        chunk["rrf_score"] = round(scores[cid], 6)
        # elimina campos internos de Supabase que no se necesitan en la respuesta
        chunk.pop("rank", None)
        result.append(chunk)

    return result
