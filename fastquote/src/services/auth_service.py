import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext

from src.repositories.admin_repository import AdminRepository
from src.schemas.admin import AdminCreate, AdminLogin

# Configuración de JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Configuración de contraseñas
# Usar PBKDF2-SHA256 evita depender de bcrypt y su límite de 72 bytes
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class AuthService:
    def __init__(self, admin_repo: AdminRepository):
        self.admin_repo = admin_repo

    def hash_password(self, password: str) -> str:
        """Hashea una contraseña usando bcrypt"""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica una contraseña contra su hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Crea un JWT token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifica y decodifica un JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.InvalidTokenError:
            return None

    async def register(self, admin_data: AdminCreate) -> Dict[str, Any]:
        """Registra un nuevo admin"""
        # Verificar si el email ya existe
        existing = await self.admin_repo.get_by_email(admin_data.email)
        if existing:
            raise ValueError("El email ya está registrado")

        # Hashear contraseña y crear admin
        hashed_password = self.hash_password(admin_data.password)
        admin_dict = {
            "email": admin_data.email,
            "password": hashed_password,
        }
        return await self.admin_repo.create(admin_dict)

    async def login(self, login_data: AdminLogin) -> Optional[str]:
        """Autentica un admin y retorna un token JWT"""
        admin = await self.admin_repo.get_by_email(login_data.email)
        if not admin:
            return None

        if not self.verify_password(login_data.password, admin["password"]):
            return None

        # Obtener id del admin (el repositorio serializa como "_id")
        admin_id = admin.get("id") or admin.get("_id")
        if not admin_id:
            return None

        # Crear token con el ID del admin
        token = self.create_access_token(data={"sub": admin_id})
        return token
