from fastapi import APIRouter, Depends, HTTPException, status

from src.schemas.admin import AdminLogin, AdminCreate, TokenResponse
from src.services.auth_service import AuthService
from src.repositories.admin_repository import AdminRepository
from src.utils.database import get_database

router = APIRouter(prefix="/auth", tags=["auth"])


async def get_auth_service() -> AuthService:
    """Crea una instancia del AuthService"""
    db = get_database()
    admin_repo = AdminRepository(db)
    return AuthService(admin_repo)


@router.post("/register", response_model=TokenResponse)
async def register(admin_data: AdminCreate, auth_service: AuthService = Depends(get_auth_service)):
    """Registra un nuevo admin y retorna un JWT token"""
    try:
        admin = await auth_service.register(admin_data)
        token = auth_service.create_access_token(data={"sub": admin["id"]})
        return TokenResponse(access_token=token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: AdminLogin, auth_service: AuthService = Depends(get_auth_service)):
    """Autentica un admin y retorna un JWT token"""
    token = await auth_service.login(login_data)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    return TokenResponse(access_token=token)
