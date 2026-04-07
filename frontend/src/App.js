import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import DashboardPage from "./DashboardPage";
import VerifyOTPPage from "./VerifyOTPPage";
import "./App.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const AUTH_STORAGE_KEY = "cet324_auth";

function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cet324_theme") || "light";
  });
  const [csrfToken, setCsrfToken] = useState("");
  const [auth, setAuth] = useState({
    token: "",
    expiresAt: 0,
    user: null,
  });

  const isLoggedIn = Boolean(auth.token && auth.user);

  const fetchCsrfToken = async () => {
    const response = await fetch(`${API_BASE_URL}/api/csrf-token`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Unable to initialize CSRF protection.");
    }
    setCsrfToken(data.csrf_token);
  };

  /* ── Restore persisted auth ── */
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.expiresAt > Date.now()) {
        setAuth(parsed);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  /* ── CSRF on mount ── */
  useEffect(() => {
    fetchCsrfToken().catch(() => {});
  }, []);

  /* ── Token expiry auto-logout ── */
  useEffect(() => {
    if (!auth.token || !auth.expiresAt) return undefined;
    const remainingMs = auth.expiresAt - Date.now();
    if (remainingMs <= 0) {
      handleLogout();
      return undefined;
    }
    const timer = setTimeout(() => handleLogout(), remainingMs);
    return () => clearTimeout(timer);
  }, [auth.token, auth.expiresAt]);

  /* ── Persist theme ── */
  useEffect(() => {
    localStorage.setItem("cet324_theme", theme);
  }, [theme]);

  const persistAuth = (nextAuth) => {
    setAuth(nextAuth);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({ token: "", expiresAt: 0, user: null });
    navigate("/");
  };

  const fetchWithAuth = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (response.status === 401) {
        handleLogout();
        throw new Error("Session expired.");
      }
      return response;
    },
    [auth.token]
  );

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  return (
    <div className={`app-root ${theme}`}>
      <Navbar
        isLoggedIn={isLoggedIn}
        user={auth.user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Routes>
          {/* Landing page — always visible */}
          <Route path="/" element={<LandingPage isLoggedIn={isLoggedIn} />} />

          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage
                  API_BASE_URL={API_BASE_URL}
                  csrfToken={csrfToken}
                  theme={theme}
                  onLogin={persistAuth}
                  fetchCsrfToken={fetchCsrfToken}
                />
              )
            }
          />
          <Route
            path="/register"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <RegisterPage
                  API_BASE_URL={API_BASE_URL}
                  csrfToken={csrfToken}
                  theme={theme}
                  fetchCsrfToken={fetchCsrfToken}
                />
              )
            }
          />
          <Route
            path="/verify-otp"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <VerifyOTPPage
                  API_BASE_URL={API_BASE_URL}
                  onLogin={persistAuth}
                />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <DashboardPage
                  auth={auth}
                  fetchWithAuth={fetchWithAuth}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>VaultEntry &middot; © 2026 Krisha Bimali</p>
      </footer>
    </div>
  );
}

export default App;
