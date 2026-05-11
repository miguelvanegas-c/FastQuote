from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.schemas.producto import ProductoCreate
from src.utils.objectid import serialize_document, to_object_id

COLLECTION_NAME = "Zapato"


class ProductoRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[COLLECTION_NAME]

    async def create(self, data: ProductoCreate) -> Dict[str, Any]:
        result = await self.collection.insert_one(data.model_dump())
        doc = await self.collection.find_one({"_id": result.inserted_id})
        return serialize_document(doc)  # type: ignore[return-value]

    async def list(self) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        async for doc in self.collection.find():
            items.append(serialize_document(doc))  # type: ignore[arg-type]
        return items

    async def get_by_id(self, producto_id: str) -> Optional[Dict[str, Any]]:
        oid = to_object_id(producto_id)
        doc = await self.collection.find_one({"_id": oid})
        return serialize_document(doc)

    async def update(self, producto_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        oid = to_object_id(producto_id)

        result = await self.collection.update_one(
            {"_id": oid},
            {"$set": data},
        )

        if result.matched_count == 0:
            return None

        doc = await self.collection.find_one({"_id": oid})
        return serialize_document(doc)

    async def delete(self, producto_id: str) -> bool:
        oid = to_object_id(producto_id)
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count == 1

