import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./secure_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_user_table_columns() -> None:
    with engine.begin() as connection:
        column_rows = connection.execute(text("PRAGMA table_info(users)")).fetchall()
        existing_columns = {row[1] for row in column_rows}

        if "full_name" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN full_name VARCHAR NOT NULL DEFAULT ''"
                )
            )

        if "role" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"
                )
            )

        if "is_verified" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0"
                )
            )

        if "otp_code" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN otp_code VARCHAR"
                )
            )

        if "otp_expires_at" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"
                )
            )
