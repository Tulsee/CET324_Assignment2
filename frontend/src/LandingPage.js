import { useNavigate } from "react-router-dom";

function LandingPage({ isLoggedIn }) {
  const navigate = useNavigate();

  const features = [
    {
      icon: "🔐",
      title: "JWT Authentication",
      desc: "Stateless, signed tokens with configurable expiry and automatic session management.",
    },
    {
      icon: "📧",
      title: "Email OTP Verification",
      desc: "Every new account is verified via a time-limited one-time passcode sent to your inbox.",
    },
    {
      icon: "🛡️",
      title: "CSRF Protection",
      desc: "Server-issued CSRF tokens are validated on every mutating request.",
    },
    {
      icon: "🤖",
      title: "reCAPTCHA",
      desc: "Google reCAPTCHA v2 blocks automated bots on registration and login.",
    },
    {
      icon: "🔑",
      title: "Strong Password Policy",
      desc: "bcrypt hashing, complexity requirements, and real-time strength feedback via zxcvbn.",
    },
    {
      icon: "⚡",
      title: "Rate Limiting",
      desc: "Registration and login endpoints are capped at 3 requests per minute per IP.",
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">Secure by design</div>
        <h1 className="hero-title">
          Your identity,<br />
          <span className="hero-highlight">safely vaulted</span>
        </h1>
        <p className="hero-subtitle">
          VaultEntry protects every sign-in with OTP email verification, CSRF
          guards, bcrypt hashing, and rate limiting — so your account stays
          yours.
        </p>
        <div className="hero-cta">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => navigate(isLoggedIn ? "/dashboard" : "/register")}
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started"}
          </button>
          {!isLoggedIn && (
            <button
              type="button"
              className="btn-hero-ghost"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="features-heading">Security features</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
