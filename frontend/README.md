# Frontend Overview

This React app is the user interface for the CET324 secure registration prototype.

Included features:
- Registration form with username, email, password, and confirm password
- Full name collection during registration
- Username/password login with JWT authentication
- Password strength meter using zxcvbn
- Client-side checks for password confirmation and username format
- Google reCAPTCHA v2 integration
- CSRF token retrieval from the FastAPI backend
- Authenticated profile view for logged-in users
- Admin-only dashboard for viewing registered users safely
- Automatic logout when JWT token expires
- Light and dark mode toggle

## Run the frontend

1. Open a terminal in the frontend folder.
2. Install dependencies with `npm install`.
3. Start the app with `npm start`.
4. Open `http://localhost:3000`.

## Backend requirement

The frontend expects the FastAPI backend to be running at `http://localhost:8000`.

## Environment

Create `frontend/.env` (or copy from `.env.example`) with:

- `REACT_APP_API_BASE_URL=http://localhost:8000`
- `REACT_APP_RECAPTCHA_SITE_KEY=your_site_key`

## Build for submission testing

Use `npm run build` to produce a production build.
