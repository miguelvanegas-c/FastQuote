from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.repositories.cotizacion_repository import CotizacionRepository
from src.repositories.producto_repository import ProductoRepository
from src.services.predict_service import PredictService
from src.utils.database import get_database

router = APIRouter(prefix="/predict", tags=["Predict"])


def get_predict_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> PredictService:
    cot_repo = CotizacionRepository(db)
    prod_repo = ProductoRepository(db)
    return PredictService(cot_repo, prod_repo)


@router.post("/train/{producto_id}")
async def train_model(
    producto_id: str,
    service: PredictService = Depends(get_predict_service),
):
    """Entrena un modelo para un producto específico."""
    return await service.train_model(producto_id)


@router.get("/predict/{producto_id}")
async def predict(
    producto_id: str,
    days: int = Query(7, ge=1, le=90),
    lead_time_days: int = Query(7, ge=1, le=90),
    service: PredictService = Depends(get_predict_service),
):
    """Predice demanda para los próximos `days` días."""
    return await service.predict(producto_id, days, lead_time_days)


@router.post("/top-three")
async def predict_top_three(
    service: PredictService = Depends(get_predict_service),
):
    """Entrena y predice para los 3 productos más cotizados en un solo flujo."""
    return await service.predict_top_three_with_auto_train()




