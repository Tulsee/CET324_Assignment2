import os
import smtplib
from email.message import EmailMessage
import logging
import asyncio
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "")

def send_otp_email_sync(to_email: str, otp_code: str):
    if not EMAIL_USER or not EMAIL_APP_PASSWORD:
        logger.warning(f"EMAIL_USER or EMAIL_APP_PASSWORD not set. Not sending actual email to {to_email}. OTP is {otp_code}")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your OTP for Secure Registration'
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg.set_content(f"Your One-Time Password (OTP) for registration is: {otp_code}\n\nIt is valid for 5 minutes.")

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_APP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Successfully sent OTP to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP to {to_email}: {e}")

async def send_otp_email(to_email: str, otp_code: str):
    # Run synchronous email sending in a threadpool so it doesn't block the async event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_otp_email_sync, to_email, otp_code)
