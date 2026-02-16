import { Navigate } from "react-router-dom";
import { getSessionMock } from "../../services/mockAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSessionMock();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}