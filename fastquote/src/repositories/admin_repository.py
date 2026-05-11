from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.utils.objectid import serialize_document, to_object_id

COLLECTION_NAME = "Admins"


class AdminRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[COLLECTION_NAME]

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.collection.insert_one(data)
        doc = await self.collection.find_one({"_id": result.inserted_id})
        return serialize_document(doc)  # type: ignore[return-value]

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({"email": email})
        return serialize_document(doc) if doc else None

    async def get_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        oid = to_object_id(admin_id)
        doc = await self.collection.find_one({"_id": oid})
        return serialize_document(doc) if doc else None
