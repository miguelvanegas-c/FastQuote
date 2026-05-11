from pydantic import BaseModel, EmailStr, Field


class AdminBase(BaseModel):
    email: EmailStr


class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8)


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminResponse(AdminBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
