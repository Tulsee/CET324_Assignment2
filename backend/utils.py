import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException
import httpx
from schemas import UserCreate, RegistrationPayload, UserPublic
from models import UserDB
import logging

logger = logging.getLogger(__name__)

COMMON_PASSWORD_FRAGMENTS = {
    "password", "qwerty", "admin", "welcome", "letmein", "iloveyou",
    "football", "monkey", "dragon", "abc123", "123456", "12345678",
}
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")
CSRF_TOKEN_TTL_MINUTES = int(os.getenv("CSRF_TOKEN_TTL_MINUTES", "30"))
RECAPTCHA_SECRET_KEY = os.getenv(
    "RECAPTCHA_SECRET_KEY", "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
)

csrf_token_store = {}

def get_client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown-client"

def issue_csrf_token(request: Request) -> str:
    token = secrets.token_urlsafe(32)
    client_key = get_client_key(request)
    csrf_token_store[client_key] = {
        "token": token,
        "expires_at": datetime.now(timezone.utc)
        + timedelta(minutes=CSRF_TOKEN_TTL_MINUTES),
    }
    return token

def validate_csrf_token(request: Request, csrf_token: str | None) -> None:
    client_key = get_client_key(request)
    stored_token = csrf_token_store.get(client_key)
    if not csrf_token or not stored_token:
        raise HTTPException(status_code=403, detail="Missing CSRF token.")
    if stored_token["expires_at"] < datetime.now(timezone.utc):
        csrf_token_store.pop(client_key, None)
        raise HTTPException(
            status_code=403, detail="CSRF token expired. Refresh and try again."
        )
    if not secrets.compare_digest(stored_token["token"], csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token.")

def sanitize_registration_data(user: UserCreate) -> RegistrationPayload:
    username = user.username.strip()
    full_name = user.full_name.strip()
    email = user.email.strip().lower()

    if not USERNAME_PATTERN.fullmatch(username):
        raise HTTPException(
            status_code=422,
            detail=(
                "Username must be 8-30 characters and use only letters, numbers, "
                "dots, underscores, or hyphens."
            ),
        )
    if any(char in username for char in "<>{}\"'"):
        raise HTTPException(
            status_code=422, detail="Username contains unsafe characters."
        )
    if len(full_name) < 8 or len(full_name) > 30:
        raise HTTPException(
            status_code=422,
            detail="Full name must be between 8 and 30 characters.",
        )
    if any(char in full_name for char in "<>{}"):
        raise HTTPException(
            status_code=422, detail="Full name contains unsafe characters."
        )
    if len(email) > 254:
        raise HTTPException(status_code=422, detail="Email address is too long.")

    return RegistrationPayload(username=username, full_name=full_name, email=email)

def validate_password_policy(password: str, username: str, email: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=422, detail="Password must be at least 8 characters long."
        )
    if len(password) > 128:
        raise HTTPException(
            status_code=422, detail="Password must be 128 characters or fewer."
        )

    requirements = {
        "uppercase": any(char.isupper() for char in password),
        "lowercase": any(char.islower() for char in password),
        "digit": any(char.isdigit() for char in password),
        "symbol": any(not char.isalnum() for char in password),
    }
    if not all(requirements.values()):
        raise HTTPException(
            status_code=422,
            detail="Password must include uppercase, lowercase, number, and symbol characters.",
        )

    lowered_password = password.lower()
    email_local_part = email.split("@", 1)[0]
    blocked_fragments = COMMON_PASSWORD_FRAGMENTS | {
        username.lower(),
        email_local_part.lower(),
    }

    if any(
        fragment and len(fragment) >= 4 and fragment in lowered_password
        for fragment in blocked_fragments
    ):
        raise HTTPException(
            status_code=422,
            detail="Password is too predictable. Avoid common words and personal information.",
        )

    if re.search(r"(.)\1\1", password):
        raise HTTPException(
            status_code=422,
            detail="Password contains repeated characters and is too easy to guess.",
        )

def to_user_public(user: UserDB) -> UserPublic:
    return UserPublic(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
    )

async def verify_recaptcha(token: str) -> bool:
    verify_url = "https://www.google.com/recaptcha/api/siteverify"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                verify_url,
                data={"secret": RECAPTCHA_SECRET_KEY, "response": token},
                timeout=10.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("reCAPTCHA verification failed due to upstream error: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Unable to verify CAPTCHA right now. Please try again shortly.",
            ) from exc

        result = response.json()
        return result.get("success", False)
