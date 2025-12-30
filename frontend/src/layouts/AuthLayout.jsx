import { Link } from "react-router-dom";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-back" aria-label="Back to home">
          ← Back
        </Link>

        <div className="auth-brand">
          <div className="auth-logo">S</div>
          <div className="auth-brand-text">
            <div className="auth-title">SpecSmart</div>
            <div className="auth-subtitle">AI PC Builder</div>
          </div>
        </div>

        <div className="auth-header-spacer" />
      </header>

      <main className="auth-main">{children}</main>
    </div>
  );
}
