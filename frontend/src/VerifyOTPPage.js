import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyOTPPage({ API_BASE_URL, onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpCode = digits.join("");

  useEffect(() => {
    if (!email) navigate("/login");
  }, [email, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index, value) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setStatus({ type: "idle", message: "" });
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setStatus({ type: "error", message: "Enter all 6 digits." });
      return;
    }

    try {
      setIsVerifying(true);
      setStatus({ type: "idle", message: "" });
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp_code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: data.detail || "Verification failed." });
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setStatus({ type: "success", message: "Verified! Redirecting to dashboard…" });
      onLogin({
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        user: data.user,
      });
      navigate("/dashboard");
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Error connecting to server." });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ type: "error", message: data.detail || "Failed to resend OTP." });
        return;
      }
      setStatus({ type: "success", message: "A new code has been sent to your email." });
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Error connecting to server." });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
              <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>Check your email</h1>
          <p className="auth-subtitle">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        {status.message && status.type !== "idle" && (
          <div className={`status-banner ${status.type}`}>{status.message}</div>
        )}

        <form onSubmit={handleVerify} className="auth-form">
          <div className="otp-boxes" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className="otp-digit"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                placeholder="·"
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoComplete="off"
              />
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={isVerifying || otpCode.length < 6}>
            {isVerifying ? (
              <span className="btn-loading">
                <span className="spinner"></span> Verifying…
              </span>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Didn't receive the code?{" "}
            <button
              type="button"
              className="auth-link btn-inline"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? "Sending…" : "Resend code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
