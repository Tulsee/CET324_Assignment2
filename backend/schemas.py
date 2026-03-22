from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    password: str
    captcha_token: str

class UserLogin(BaseModel):
    username: str
    password: str
    captcha_token: str

class RegistrationPayload(BaseModel):
    username: str
    full_name: str
    email: EmailStr

class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: str
    is_verified: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserPublic

class AdminUsersPayload(BaseModel):
    total_users: int
    users: list[UserPublic]

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

class ResendOTPRequest(BaseModel):
    email: EmailStr
