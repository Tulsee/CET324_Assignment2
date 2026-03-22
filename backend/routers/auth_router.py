from datetime import datetime, timedelta, timezone
import secrets
import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models import UserDB
from schemas import (
    UserCreate, UserLogin, TokenResponse, VerifyOTPRequest, ResendOTPRequest
)
from auth import (
    authenticate_user, create_access_token, get_password_hash
)
from utils import (
    issue_csrf_token, CSRF_TOKEN_TTL_MINUTES, sanitize_registration_data,
    validate_password_policy, validate_csrf_token, verify_recaptcha, to_user_public
)
from email_service import send_otp_email

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(6))

@router.get("/csrf-token")
def get_csrf_token(request: Request):
    token = issue_csrf_token(request)
    return {"csrf_token": token, "expires_in_minutes": CSRF_TOKEN_TTL_MINUTES}

@router.post("/register")
@limiter.limit("3/minute")
async def register_user(
    request: Request,
    user: UserCreate,
    db: Session = Depends(get_db),
    x_csrf_token: str | None = Header(default=None),
):
    payload = sanitize_registration_data(user)
    validate_password_policy(user.password, payload.username, payload.email)
    validate_csrf_token(request, x_csrf_token)

    logger.info("Registration attempt for username: %s", payload.username)

    is_human = await verify_recaptcha(user.captcha_token)
    if not is_human:
        logger.warning("CAPTCHA failed for %s", payload.username)
        raise HTTPException(
            status_code=400, detail="CAPTCHA verification failed. Bot detected."
        )

    existing_user = (
        db.query(UserDB)
        .filter((UserDB.username == payload.username) | (UserDB.email == payload.email))
        .first()
    )
    if existing_user:
        logger.warning(
            "Duplicate registration attempt for %s or %s",
            payload.username,
            payload.email,
        )
        raise HTTPException(
            status_code=400, detail="Username or email already registered."
        )

    otp_code = generate_otp()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    new_user = UserDB(
        username=payload.username,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(user.password),
        role="user",
        is_verified=False,
        otp_code=otp_code,
        otp_expires_at=otp_expires_at
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    await send_otp_email(new_user.email, otp_code)

    logger.info("User %s successfully registered, pending verification", payload.username)
    return {
        "message": "Registration successful! Please check your email for the OTP.",
        "username": payload.username,
    }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("3/minute")
async def login_user(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db),
    x_csrf_token: str | None = Header(default=None),
):
    validate_csrf_token(request, x_csrf_token)

    is_human = await verify_recaptcha(credentials.captcha_token)
    if not is_human:
        logger.warning("Login CAPTCHA failed for %s", credentials.username)
        raise HTTPException(
            status_code=400, detail="CAPTCHA verification failed. Bot detected."
        )

    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not user.is_verified:
        now = datetime.now(timezone.utc)
        if not user.otp_expires_at or now > user.otp_expires_at.replace(tzinfo=timezone.utc):
            # Expired, generate new OTP
            otp_code = generate_otp()
            user.otp_code = otp_code
            user.otp_expires_at = now + timedelta(minutes=5)
            db.commit()
            await send_otp_email(user.email, otp_code)
            raise HTTPException(
                status_code=403,
                detail={"error": "unverified", "message": "Email not verified. Your previous OTP expired, so a new one has been sent.", "email": user.email}
            )
        else:
            raise HTTPException(
                status_code=403,
                detail={"error": "unverified", "message": "Email not verified. Please check your email for the OTP.", "email": user.email}
            )

    token, expires_in = create_access_token(user.username, user.role)
    logger.info("User %s logged in", user.username)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=to_user_public(user),
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    user = db.query(UserDB).filter(UserDB.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")

    now = datetime.now(timezone.utc)
    if not user.otp_expires_at or now > user.otp_expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if user.otp_code != payload.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    token, expires_in = create_access_token(user.username, user.role)
    logger.info("User %s verified email and is logged in", user.username)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=to_user_public(user),
    )


@router.post("/resend-otp")
async def resend_otp(
    payload: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    user = db.query(UserDB).filter(UserDB.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")

    now = datetime.now(timezone.utc)
    # Check if a valid OTP still exists
    if user.otp_expires_at and now < user.otp_expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=429, detail="A valid OTP already exists. Please wait before requesting a new one.")

    otp_code = generate_otp()
    user.otp_code = otp_code
    user.otp_expires_at = now + timedelta(minutes=5)
    db.commit()

    await send_otp_email(user.email, otp_code)
    
    return {"message": "A new OTP has been sent."}
