from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import UserDB
from schemas import UserPublic, AdminUsersPayload
from auth import get_current_user, get_current_admin
from utils import to_user_public

router = APIRouter()

@router.get("/profile", response_model=UserPublic)
def get_profile(current_user: UserDB = Depends(get_current_user)):
    return to_user_public(current_user)

@router.get("/admin/users", response_model=AdminUsersPayload)
def get_all_users(
    db: Session = Depends(get_db),
    _: UserDB = Depends(get_current_admin),
):
    users = db.query(UserDB).all()
    safe_users = [to_user_public(user) for user in users]
    return AdminUsersPayload(total_users=len(safe_users), users=safe_users)
