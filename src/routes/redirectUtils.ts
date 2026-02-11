export type SanitizeRedirectOptions = {
  disallowLogin?: boolean;
};

const ALLOWED_ROUTE_PREFIXES = [
  "/",
  "/about",
  "/planner",
  "/tracker",
  "/settings",
  "/login",
  "/accounts",
  "/imports",
  "/profile",
  "/dev",
] as const;

function isInternalPath(raw: string): boolean {
  if (!raw.startsWith("/")) return false;
  if (raw.startsWith("//")) return false;
  if (raw.includes("://")) return false;
  return true;
}

function getBasePath(raw: string): string {
  const idxQ = raw.indexOf("?");
  const idxH = raw.indexOf("#");
  const idx =
    idxQ === -1 ? idxH : idxH === -1 ? idxQ : Math.min(idxQ, idxH);
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

function isAllowedAppPath(path: string): boolean {
  // Special-case root.
  if (path === "/") return true;

  return ALLOWED_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/") return false;
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback: string,
  options?: SanitizeRedirectOptions
): string {
  if (!raw) return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (!isInternalPath(trimmed)) return fallback;

  const base = getBasePath(trimmed);

  if (options?.disallowLogin && base === "/login") return fallback;

  if (!isAllowedAppPath(base)) return fallback;

  return trimmed;
}
