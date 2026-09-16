from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import UserRoleEnum


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRoleEnum

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRoleEnum = UserRoleEnum.student

    @field_validator("password")
    @classmethod
    def bcrypt_length(cls, value):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut
