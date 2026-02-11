import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BasicSpinner } from "../components/ui/BasicSpinner";
import { sanitizeRedirectPath } from "./redirectUtils";

function shouldBypassAuthForE2E(): boolean {
  const raw = import.meta.env.VITE_E2E_BYPASS_AUTH;
  return raw === "1" || raw === "true";
}

export function RequireAuth({ signedIn, loading }: { signedIn: boolean; loading: boolean }) {
  const location = useLocation();

  if (shouldBypassAuthForE2E()) return <Outlet />;

  // Avoid a redirect flash during the initial auth bootstrap on reload.
  if (loading) return <BasicSpinner />;

  if (signedIn) return <Outlet />;

  const next = sanitizeRedirectPath(`${location.pathname}${location.search}`, "/planner");
  const to = `/login?redirect=${encodeURIComponent(next)}`;
  return <Navigate to={to} replace />;
}
