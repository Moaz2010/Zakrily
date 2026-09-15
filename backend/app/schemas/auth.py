from pydantic import BaseModel, EmailStr

from app.schemas.common import UserRoleEnum


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRoleEnum

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRoleEnum = UserRoleEnum.student


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut
