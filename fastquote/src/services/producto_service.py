from fastapi import HTTPException, status

from src.repositories.producto_repository import ProductoRepository
from src.schemas.producto import ProductoCreate, ProductoUpdate


class ProductoService:
    def __init__(self, repo: ProductoRepository):
        self.repo = repo

    async def crear(self, data: ProductoCreate):
        return await self.repo.create(data)

    async def listar(self):
        return await self.repo.list()

    async def obtener(self, producto_id: str):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )
        return producto

    async def actualizar(self, producto_id: str, data: ProductoUpdate):
        payload = data.model_dump(exclude_unset=True)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes enviar al menos un campo para actualizar",
            )

        producto = await self.repo.update(producto_id, payload)
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )
        return producto

    async def eliminar(self, producto_id: str):
        deleted = await self.repo.delete(producto_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )
        return {"message": "Producto eliminado correctamente"}

