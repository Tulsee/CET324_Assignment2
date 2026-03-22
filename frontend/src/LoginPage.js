import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export default function LoginPage({ API_BASE_URL, csrfToken, theme, onLogin, fetchCsrfToken }) {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!loginData.username.trim() || !loginData.password) {
      setStatus({
        type: "error",
        message: "Username and password are required.",
      });
      return;
    }

    if (!captchaToken) {
      setStatus({
        type: "error",
        message: "Please complete the CAPTCHA challenge.",
      });
      return;
    }

    if (!csrfToken) {
      setStatus({
        type: "error",
        message: "Security token not loaded. Refresh the page.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: "idle", message: "" });

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          username: loginData.username.trim(),
          password: loginData.password,
          captcha_token: captchaToken,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.log("Login error:", data);
        
        let errorMsg = "Login failed.";
        let errType = "error";
        let redirectEmail = null;

        if (typeof data.detail === "string") {
          errorMsg = data.detail;
        } else if (data.detail && typeof data.detail === "object") {
          errorMsg = data.detail.message || "An error occurred.";
          if (data.detail.error === "unverified") {
            redirectEmail = data.detail.email;
          }
        } else if (data?.error) {
          errorMsg = data.error;
        }

        setStatus({
          type: errType,
          message: errorMsg,
        });

        if (redirectEmail) {
          setTimeout(() => {
            navigate("/verify-otp", { state: { email: redirectEmail } });
          }, 2000);
        }
        return;
      }

      const expiresAt = Date.now() + data.expires_in * 1000;
      onLogin({ token: data.access_token, expiresAt, user: data.user });
      await fetchCsrfToken();
      navigate("/dashboard");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Error connecting to server.",
      });
    } finally {
      setIsSubmitting(false);
      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaToken(null);
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your CET324 Secure Account</p>
        </div>

        {status.message && status.type !== "idle" && (
          <div className={`status-banner ${status.type}`}>{status.message}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="loginUsername">Username</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="loginUsername"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="loginPassword">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="loginPassword"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="captcha-container">
            <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} theme={theme} />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="spinner"></span> Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
