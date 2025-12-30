import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

export default function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/login/", {
        username,
        password,
      });
      const token = res.data.access;
      localStorage.setItem("token", token);

      // Fetch user details to get role
      const me = await axios.get("http://127.0.0.1:8000/api/auth/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(me.data);

      if (me.data.role === "ADMIN") navigate("/admin");
      else navigate("/user");
    } catch (e) {
      console.log("LOGIN ERROR:", e.response?.data || e.message);
      if (e.response && e.response.status === 401) {
        setErr("Invalid username or password.");
      } else {
        setErr("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1 className="auth-card-title">Sign in</h1>
        <p className="auth-card-desc">Use your SpecSmart account to continue.</p>

        {err && <div className="auth-error">{err}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />

          <button className="auth-button" type="submit">
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          Don’t have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
