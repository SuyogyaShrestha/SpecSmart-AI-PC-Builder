import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setErr("");

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErr("Please enter a valid email address.");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/api/auth/register/", {
        username, email, password
      });
      alert("Registered! Now login.");
      navigate("/login");
    } catch (e) {
      console.log("REGISTER ERROR:", e.response?.data);
      // Backend typically returns { username: ["error text"], email: ["error text"] }
      if (e.response?.data) {
        const data = e.response.data;
        // Grab the first error message available
        const firstError = Object.values(data).flat()[0];
        setErr(firstError || "Registration failed. Try again.");
      } else {
        setErr("Something went wrong. Please check your connection.");
      }
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1 className="auth-card-title">Create account</h1>
        <p className="auth-card-desc">Create a new SpecSmart account.</p>

        {err && <div className="auth-error">{err}</div>}

        <form className="auth-form" onSubmit={handleRegister}>
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
          />

          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />

          <button className="auth-button" type="submit">
            Create account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
