CET324 Assignment 2: Secure Registration System
Name: Replace with your name before submission
Student ID: Replace with your student ID before submission

PROJECT OVERVIEW
This project is a secure registration prototype built for CET324 Assignment 2.

Implemented Part 1 security features:
- React registration interface with username, email, password, and confirm password fields
- Registration now includes full name capture
- Password strength evaluation using zxcvbn plus custom complexity checks
- Google reCAPTCHA v2 test integration to reduce bot registrations
- Password hashing with bcrypt via passlib
- SQL injection mitigation through SQLAlchemy ORM
- XSS mitigation through strict username validation and React's escaped rendering
- CSRF mitigation using backend-issued anti-CSRF tokens
- Rate limiting on the registration endpoint
- Login with username and password using JWT bearer tokens
- JWT expiry and automatic frontend logout on token expiration
- Profile endpoint and authenticated profile view
- Admin dashboard (shown only to admin role) that lists registered users without exposing password hashes
- Logging of registration events for monitoring and demonstration purposes

SYSTEM SETUP INSTRUCTIONS

BACKEND (FastAPI)
1. Open a terminal in the backend folder.
2. Create a virtual environment if needed:
   Windows: py -m venv .venv
3. Activate the virtual environment:
   Windows: .venv\Scripts\activate
4. Install dependencies:
   pip install -r requirements.txt
5. Optional environment variables:
   Copy .env.example to .env and set values.
   Required keys include JWT_SECRET_KEY, JWT_EXPIRE_MINUTES, and ALLOWED_ORIGINS.
6. Start the backend server:
   uvicorn main:app --reload
7. Backend URL:
   http://localhost:8000
8. Seed an admin account (optional but recommended):
   .venv\Scripts\python seed_admin.py

Default seed values come from backend/.env:
- ADMIN_SEED_USERNAME=admin
- ADMIN_SEED_PASSWORD=Admin@12345
- ADMIN_SEED_EMAIL=admin@example.com
- ADMIN_SEED_FULL_NAME=System Administrator

FRONTEND (React)
1. Open a terminal in the frontend folder.
2. Install dependencies:
   npm install
3. Start the frontend server:
   npm start
4. Frontend URL:
   http://localhost:3000
5. Frontend environment configuration:
   Copy frontend/.env.example to frontend/.env and set REACT_APP_API_BASE_URL and REACT_APP_RECAPTCHA_SITE_KEY.

DEMONSTRATION CHECKLIST FOR PART 1
1. Show registration with full name and password strength feedback.
2. Show the form blocking submission until password confirmation matches.
3. Complete the CAPTCHA and register a user successfully.
4. Log in with username/password and show profile data.
5. Log in as admin and show the dashboard loading the user list.
6. Show automatic logout behavior when token expires (set a short JWT_EXPIRE_MINUTES for demo).

NOTES
- The frontend uses Google's public reCAPTCHA test site key for assignment/demo use.
- The backend uses Google's public reCAPTCHA test secret by default unless overridden.
- Backend uses environment-driven JWT settings from backend/.env.
- Update the name and student ID placeholders before packaging the final ZIP.