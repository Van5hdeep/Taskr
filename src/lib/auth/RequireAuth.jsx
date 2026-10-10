import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";
import FullScreenLoader from "../../components/ui/FullScreenLoader";

/** Route guard: signed-out visitors are sent to sign-in and returned afterwards. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Inverse guard for the landing and auth pages. */
export function RedirectIfAuthed({ children }) {
  const { session, loading, isPasswordRecovery } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (session && !isPasswordRecovery) return <Navigate to={location.state?.from || "/home"} replace />;
  return children;
}
