import os

from dotenv import load_dotenv

from database import SessionLocal
from models import UserDB
from auth import get_password_hash

load_dotenv()


def seed_admin() -> None:
    username = os.getenv("ADMIN_SEED_USERNAME", "admin")
    password = os.getenv("ADMIN_SEED_PASSWORD", "Admin@12345")
    email = os.getenv("ADMIN_SEED_EMAIL", "admin@example.com").lower()
    full_name = os.getenv("ADMIN_SEED_FULL_NAME", "System Administrator")

    db = SessionLocal()
    try:
        admin_user = db.query(UserDB).filter(UserDB.username == username).first()

        if admin_user:
            admin_user.role = "admin"
            admin_user.full_name = full_name
            admin_user.email = email
            admin_user.hashed_password = get_password_hash(password)
            admin_user.is_verified = True
            db.commit()
            print(f"Updated existing admin user: {username}")
            return

        new_admin = UserDB(
            username=username,
            full_name=full_name,
            email=email,
            hashed_password=get_password_hash(password),
            role="admin",
            is_verified=True,
        )
        db.add(new_admin)
        db.commit()
        print(f"Created admin user: {username}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
