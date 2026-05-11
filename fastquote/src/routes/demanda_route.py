from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.repositories.cotizacion_repository import CotizacionRepository
from src.repositories.producto_repository import ProductoRepository
from src.services.analisis_demanda_service import AnalisiserDemandaService
from src.utils.database import get_database

router = APIRouter(prefix="/demanda", tags=["Demanda & Predicción"])


def get_analisis_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AnalisiserDemandaService:
    cotizacion_repo = CotizacionRepository(db)
    producto_repo = ProductoRepository(db)
    return AnalisiserDemandaService(cotizacion_repo, producto_repo)


@router.get("/analizar")
async def analizar_demanda(
    service: AnalisiserDemandaService = Depends(get_analisis_service),
):
    """
    Analiza qué productos se piden más en las cotizaciones.
    Muestra demanda por producto y tallas más populares.
    """
    return await service.analizar_demanda_por_producto()


@router.get("/sugerencias-stock")
async def sugerir_stock(
    porcentaje_seguridad: int = Query(20, ge=0, le=100, description="% de stock de seguridad"),
    service: AnalisiserDemandaService = Depends(get_analisis_service),
):
    """
    Sugiere niveles óptimos de stock basado en demanda de cotizaciones.
    
    Respuestas:
    - REABASTECER: El stock actual es menor al sugerido
    - OK: El stock está en los niveles recomendados
    - SOBRESTOCK: Tienes más stock del necesario
    """
    return await service.sugerir_niveles_stock(porcentaje_seguridad)


@router.get("/rotacion-inventario")
async def rotacion(
    service: AnalisiserDemandaService = Depends(get_analisis_service),
):
    """
    Predice cuáles productos se van a agotar pronto basado en demanda.
    Muestra criticidad y días estimados hasta agotarse.
    """
    return await service.predecir_rotacion_inventario()


@router.get("/estadisticas")
async def estadisticas(
    service: AnalisiserDemandaService = Depends(get_analisis_service),
):
    """
    Estadísticas generales de cotizaciones y clientes.
    Muestra total de cotizaciones, clientes únicos, cliente más activo.
    """
    return await service.estadisticas_cotizaciones()

