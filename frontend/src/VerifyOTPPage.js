import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

export default function VerifyOTPPage({ API_BASE_URL, onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      // If no email is provided via state, bounce back to login
      navigate("/");
    }
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setStatus({ type: "error", message: "OTP must be exactly 6 digits." });
      return;
    }

    try {
      setIsVerifying(true);
      setStatus({ type: "idle", message: "" });
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.detail || "Verification failed.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Verification successful! Redirecting to dashboard...",
      });

      // Save token and navigate
      onLogin({
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        user: data.user,
      });
      // App.js routes will automatically take care of navigating to dashboard
      navigate("/dashboard");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Error connecting to server.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setStatus({ type: "idle", message: "" });
      const response = await fetch(`${API_BASE_URL}/api/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.detail || "Failed to resend OTP.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "A new OTP has been sent to your email.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Error connecting to server.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🛡️</div>
          <h1>Verify Email</h1>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
        </div>

        {status.message && status.type !== "idle" && (
          <div className={`status-banner ${status.type}`}>{status.message}</div>
        )}

        <form onSubmit={handleVerify} className="auth-form">
          <div className="input-group">
            <label htmlFor="otpCode">One-Time Password (OTP)</label>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                id="otpCode"
                type="text"
                name="otpCode"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoComplete="off"
                maxLength={6}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isVerifying}>
            {isVerifying ? (
              <span className="btn-loading">
                <span className="spinner"></span> Verifying...
              </span>
            ) : (
              "Verify OTP"
            )}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "1rem" }}>
          <p>
            Didn't receive the code?{" "}
            <button
              type="button"
              className="auth-link"
              onClick={handleResend}
              disabled={isResending}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}
            >
              Resend OTP
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
