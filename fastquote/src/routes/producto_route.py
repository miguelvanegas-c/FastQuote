from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.repositories.producto_repository import ProductoRepository
from src.schemas.producto import ProductoCreate, ProductoOut, ProductoUpdate
from src.services.producto_service import ProductoService
from src.utils.database import get_database

router = APIRouter(prefix="/productos", tags=["Productos"])


def get_producto_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> ProductoService:
    return ProductoService(ProductoRepository(db))


@router.post(
    "/",
    response_model=ProductoOut,
    response_model_by_alias=True,
    status_code=201,
)
async def crear_producto(
    data: ProductoCreate,
    service: ProductoService = Depends(get_producto_service),
):
    return await service.crear(data)


@router.get(
    "/",
    response_model=list[ProductoOut],
    response_model_by_alias=True,
)
async def listar_productos(
    service: ProductoService = Depends(get_producto_service),
):
    return await service.listar()


@router.get(
    "/{producto_id}",
    response_model=ProductoOut,
    response_model_by_alias=True,
)
async def obtener_producto(
    producto_id: str,
    service: ProductoService = Depends(get_producto_service),
):
    return await service.obtener(producto_id)


@router.put(
    "/{producto_id}",
    response_model=ProductoOut,
    response_model_by_alias=True,
)
@router.patch(
    "/{producto_id}",
    response_model=ProductoOut,
    response_model_by_alias=True,
)
async def actualizar_producto(
    producto_id: str,
    data: ProductoUpdate,
    service: ProductoService = Depends(get_producto_service),
):
    return await service.actualizar(producto_id, data)


@router.delete("/{producto_id}")
async def eliminar_producto(
    producto_id: str,
    service: ProductoService = Depends(get_producto_service),
):
    return await service.eliminar(producto_id)

