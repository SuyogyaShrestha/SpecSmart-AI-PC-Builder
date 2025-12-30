import { Navigate } from "react-router-dom";

export default function ProtectedAdmin({ user, children }) {
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

