from typing import Optional

from pydantic import BaseModel, Field


class ProductoEnCotizacion(BaseModel):
    id: str = Field(..., alias="_id")
    nombre: str
    precio: float
    stock: int
    talla: int

    class Config:
        populate_by_name = True


class ConsultaOriginal(BaseModel):
    zapatos: list[dict]
    mensaje: str


class Cotizacion(BaseModel):
    id: str = Field(..., alias="_id")
    consultaOriginal: ConsultaOriginal
    productos: list[ProductoEnCotizacion]
    listaReferencias: Optional[list] = None
    correo: str

    class Config:
        populate_by_name = True

