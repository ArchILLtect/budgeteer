import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BasicSpinner } from "../components/ui/BasicSpinner";

function shouldBypassAuthForE2E(): boolean {
  const raw = import.meta.env.VITE_E2E_BYPASS_AUTH;
  return raw === "1" || raw === "true";
}

function sanitizeRedirect(raw: string | null): string {
  if (!raw) return "/planner";
  // Only allow internal paths to prevent open redirects.
  if (!raw.startsWith("/")) return "/planner";
  if (raw.startsWith("//")) return "/planner";
  if (raw.includes("://")) return "/planner";
  return raw;
}

export function RequireAuth({ signedIn, loading }: { signedIn: boolean; loading: boolean }) {
  const location = useLocation();

  if (shouldBypassAuthForE2E()) return <Outlet />;

  // Avoid a redirect flash during the initial auth bootstrap on reload.
  if (loading) return <BasicSpinner />;

  if (signedIn) return <Outlet />;

  const next = sanitizeRedirect(`${location.pathname}${location.search}`);
  const to = `/login?redirect=${encodeURIComponent(next)}`;
  return <Navigate to={to} replace />;
}
