import { Navigate } from "react-router-dom";
import { getAccessToken } from "../../services/api";

export default function RequireAuth({ children }: any) {
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}