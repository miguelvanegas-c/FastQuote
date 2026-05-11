from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    precio: float = Field(..., ge=0)
    stock: int = Field(..., ge=0)
    talla: int = Field(..., ge=1, le=60)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    precio: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=None, ge=0)
    talla: Optional[int] = Field(default=None, ge=1, le=60)


class ProductoOut(ProductoBase):
    id: str = Field(alias="_id")

    model_config = ConfigDict(populate_by_name=True)

