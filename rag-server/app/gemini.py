"""Cliente Ollama – embeddings + generación local."""

from __future__ import annotations
import ollama

EMBEDDING_MODEL = "nomic-embed-text"
EMBEDDING_DIMS = 768
GENERATION_MODEL = "gemma2:2b"


def _get_client():
    return None  # ollama no necesita cliente


def embed_texts(texts: list[str]) -> list[list[float]]:
    return [
        ollama.embeddings(model=EMBEDDING_MODEL, prompt=t)["embedding"]
        for t in texts
    ]


def embed_query(text: str) -> list[float]:
    return ollama.embeddings(model=EMBEDDING_MODEL, prompt=text)["embedding"]


_SYSTEM_PROMPT = """
Eres un asistente útil que responde basándose exclusivamente en el contexto
proporcionado. Si la respuesta no está en el contexto, dilo.
Cita el número de página cuando esté disponible.
Responde en el mismo idioma que el usuario.
""".strip()


def generate_answer(question: str, context_chunks: list[dict]) -> str:
    context_text = "\n\n---\n\n".join(
        f"[Página {c.get('page_number', '?')}]\n{c['content']}"
        for c in context_chunks
    )
    prompt = f"Contexto:\n{context_text}\n\nPregunta: {question}\n\nRespuesta:"
    response = ollama.chat(
        model=GENERATION_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return response["message"]["content"]