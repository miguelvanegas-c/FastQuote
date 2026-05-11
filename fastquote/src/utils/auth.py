from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.services.auth_service import AuthService
from src.repositories.admin_repository import AdminRepository
from src.utils.database import get_database

security = HTTPBearer()


async def get_auth_service() -> AuthService:
    """Crea una instancia del AuthService"""
    db = get_database()
    admin_repo = AdminRepository(db)
    return AuthService(admin_repo)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    """Valida el token JWT y retorna el admin actual"""
    token = credentials.credentials
    payload = auth_service.verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_repo = AdminRepository(get_database())
    admin = await admin_repo.get_by_id(admin_id)

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin
