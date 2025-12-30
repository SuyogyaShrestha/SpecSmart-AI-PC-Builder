import { Navigate } from "react-router-dom";

export default function ProtectedUser({ user, children }) {
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "USER") return <Navigate to="/" replace />;
  return children;
}

