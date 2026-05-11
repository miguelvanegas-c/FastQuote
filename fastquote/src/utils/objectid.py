from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import HTTPException, status


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de producto inválido",
        )
    return ObjectId(value)


def serialize_document(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None

    doc["_id"] = str(doc["_id"])
    return doc

