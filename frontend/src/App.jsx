import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";

import Home from "./pages/Home";
import AiPcBuilder from "./pages/AiPcBuilder";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedAdmin from "./ProtectedAdmin";
import ProtectedUser from "./ProtectedUser";
import ProtectedAuth from "./ProtectedAuth";
import Navbar from "./pages/Navbar";

export default function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const hideNav = location.pathname === "/login" || location.pathname === "/register";

  // keep logged in after refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get("http://127.0.0.1:8000/api/auth/me/", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(res => setUser(res.data))
    .catch(() => setUser(null));
  }, []);

  return (
    <>
      {!hideNav && <Navbar user={user} />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/builder" element={<AiPcBuilder />} />

        <Route
          path="/login"
          element={
            <ProtectedAuth user={user}>
              <Login setUser={setUser} />
            </ProtectedAuth>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedAuth user={user}>
              <Register />
            </ProtectedAuth>
          }
        />

        <Route
          path="/user"
          element={
            <ProtectedUser user={user}>
              <UserDashboard user={user} />
            </ProtectedUser>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedAdmin user={user}>
              <AdminDashboard user={user} />
            </ProtectedAdmin>
          }
        />
      </Routes>
    </>
  );
}
