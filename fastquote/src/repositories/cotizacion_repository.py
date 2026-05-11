from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

COLLECTION_NAME = "Cotizacion"


class CotizacionRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[COLLECTION_NAME]

    async def obtener_todas(self) -> List[Dict[str, Any]]:
        """Obtiene todas las cotizaciones."""
        items: List[Dict[str, Any]] = []
        async for doc in self.collection.find():
            items.append(self._serialize(doc))
        return items

    async def obtener_por_producto(self, nombre_producto: str) -> List[Dict[str, Any]]:
        """Obtiene todas las cotizaciones que contienen un producto específico."""
        items: List[Dict[str, Any]] = []
        async for doc in self.collection.find(
            {"productos.nombre": {"$regex": nombre_producto, "$options": "i"}}
        ):
            items.append(self._serialize(doc))
        return items

    async def obtener_recientes(self, limite: int = 50) -> List[Dict[str, Any]]:
        """Obtiene las cotizaciones más recientes."""
        items: List[Dict[str, Any]] = []
        async for doc in self.collection.find().sort("_id", -1).limit(limite):
            items.append(self._serialize(doc))
        return items

    async def contar_cotizaciones(self) -> int:
        """Cuenta el total de cotizaciones."""
        return await self.collection.count_documents({})

    async def contar_por_producto(self, nombre_producto: str) -> int:
        """Cuenta cuántas cotizaciones contienen un producto."""
        return await self.collection.count_documents(
            {"productos.nombre": {"$regex": nombre_producto, "$options": "i"}}
        )

    def _serialize(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

