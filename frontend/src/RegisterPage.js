import { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import zxcvbn from "zxcvbn";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY =
  process.env.REACT_APP_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;

export default function RegisterPage({
  API_BASE_URL,
  csrfToken,
  theme,
  fetchCsrfToken,
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthData = useMemo(() => {
    if (passwordScore === 0)
      return { label: "", color: "var(--muted)", width: "0%" };
    if (passwordScore <= 1)
      return { label: "Weak", color: "#ef4444", width: "25%" };
    if (passwordScore === 2)
      return { label: "Fair", color: "#f59e0b", width: "50%" };
    if (passwordScore === 3)
      return { label: "Good", color: "#22c55e", width: "75%" };
    return { label: "Strong", color: "#10b981", width: "100%" };
  }, [passwordScore]);

  const evaluatePassword = (password) => {
    const evaluation = zxcvbn(password);
    let score = evaluation.score;
    let feedback =
      evaluation.feedback.warning || "Add extra words or unusual characters.";

    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      score = Math.min(score, 2);
      feedback = "Must be 8+ chars, with upper, lower, number, and symbol.";
    }

    if (password.length === 0) {
      score = 0;
      feedback = "";
    } else if (
      score >= 3 &&
      hasLength &&
      hasUpper &&
      hasLower &&
      hasNumber &&
      hasSpecial
    ) {
      feedback = "Strong password!";
    }

    setPasswordFeedback(feedback);
    setPasswordScore(score);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus({ type: "idle", message: "" });
    if (name === "password") evaluatePassword(value);
  };

  const getValidationMessage = () => {
    if (!USERNAME_PATTERN.test(formData.username.trim()))
      return "Username must be 8–30 characters (letters, numbers, dots, underscores, hyphens).";
    if (formData.fullName.trim().length < 8) return "Full name is required.";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match.";
    if (passwordScore < 2) return "Choose a stronger password.";
    if (!captchaToken) return "Complete the CAPTCHA challenge.";
    if (!csrfToken) return "Security token not loaded. Refresh the page.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = getValidationMessage();

    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: "idle", message: "" });

      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          full_name: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          captcha_token: captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.detail || "Registration failed.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: data.message || "Registration successful! Redirecting to verification...",
      });
      const registeredEmail = formData.email.trim().toLowerCase();
      // Reset form
      setFormData({
        username: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setCaptchaToken(null);
      setPasswordScore(0);
      setPasswordFeedback("");
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate("/verify-otp", { state: { email: registeredEmail } });
      }, 2000);
      await fetchCsrfToken();
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

  const validationMessage = getValidationMessage();

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--register">
        <div className="auth-header">
          <div className="auth-icon">🛡️</div>
          <h1>Create Account</h1>
          <p className="auth-subtitle">
            Register for your secure CET324 account
          </p>
        </div>

        {status.message && status.type !== "idle" && (
          <div className={`status-banner ${status.type}`}>{status.message}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">📝</span>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div className="strength-section">
                  <div className="strength-meter">
                    <div
                      className="strength-bar"
                      style={{
                        width: strengthData.width,
                        backgroundColor: strengthData.color,
                      }}
                    ></div>
                  </div>
                  <span
                    className="strength-label"
                    style={{ color: strengthData.color }}
                  >
                    {strengthData.label}
                    {passwordFeedback && ` — ${passwordFeedback}`}
                  </span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <div className="captcha-container">
            <ReCAPTCHA
              ref={captchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={setCaptchaToken}
              theme={theme}
            />
          </div>

          {validationMessage && (
            <p className="helper-text">{validationMessage}</p>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="spinner"></span> Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
