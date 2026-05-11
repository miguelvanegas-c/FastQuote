"""
Cliente HTTP para el backend de inventario (productos).

Llama a localhost:8000/productos y devuelve los datos crudos
para que Gemini los interprete y responda en lenguaje natural.
"""

from __future__ import annotations

import httpx

from app.config import get_settings

# Schema que le describimos a Gemini para que entienda los datos:
PRODUCTO_SCHEMA = """
Cada producto de la tienda de zapatos tiene estos campos:
- _id     : identificador único
- nombre  : nombre del zapato (marca + modelo, ej: "Nike Air Force 1")
- precio  : precio en pesos colombianos (float)
- stock   : unidades disponibles en inventario (int)
- talla   : talla del zapato en numeración europea (int, entre 1 y 60)
"""


def _base_url() -> str:
    return get_settings().inventory_api_url.rstrip("/")


async def listar_productos() -> list[dict]:
    """Trae todos los productos del backend."""
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{_base_url()}/productos/")
        res.raise_for_status()
        return res.json()


async def obtener_producto(producto_id: str) -> dict:
    """Trae un producto por ID."""
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{_base_url()}/productos/{producto_id}")
        res.raise_for_status()
        return res.json()
