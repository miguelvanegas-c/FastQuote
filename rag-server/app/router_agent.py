"""Router inteligente usando Ollama."""

from __future__ import annotations
import ollama
from app.gemini import GENERATION_MODEL
from app.inventory import PRODUCTO_SCHEMA

_ROUTER_PROMPT = """Clasifica la pregunta en UNA palabra: inventory o documents.
- inventory: productos, precios, stock, tallas, disponibilidad
- documents: políticas, manuales, información de la empresa

Responde SOLO con una palabra: inventory o documents

Pregunta: {question}"""

_INVENTORY_PROMPT = """Eres un asistente de ventas de zapatos.
Responde basándote ÚNICAMENTE en estos datos de inventario.
Responde en el mismo idioma del usuario.

Inventario:
{inventory_data}

Pregunta: {question}"""


def classify_intent(question: str) -> str:
    try:
        response = ollama.chat(
            model=GENERATION_MODEL,
            messages=[{"role": "user", "content": _ROUTER_PROMPT.format(question=question)}],
        )
        result = response["message"]["content"].strip().lower()
        return "inventory" if "inventory" in result else "documents"
    except Exception:
        return "documents"


def answer_from_inventory(question: str, products: list[dict]) -> str:
    lines = [
        f"- {p.get('nombre')} | Talla: {p.get('talla')} | Stock: {p.get('stock')} | Precio: ${p.get('precio'):,.0f}"
        for p in products
    ]
    inventory_text = "\n".join(lines) if lines else "Sin productos."
    response = ollama.chat(
        model=GENERATION_MODEL,
        messages=[{"role": "user", "content": _INVENTORY_PROMPT.format(
            inventory_data=inventory_text, question=question
        )}],
    )
    return response["message"]["content"]