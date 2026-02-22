import { usePerfLogStore, type PerfEvent, type PerfEventKind } from "../store/perfLogStore";

function getCurrentRoute(): string | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const { pathname, search, hash } = window.location;
    const route = `${pathname ?? ""}${search ?? ""}${hash ?? ""}`.trim();
    return route || undefined;
  } catch {
    return undefined;
  }
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function recordPerfEvent(input: Omit<PerfEvent, "id" | "occurredAt"> & { occurredAt?: string }): void {
  try {
    const evt: PerfEvent = {
      id: makeId(),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      ...input,
    };
    usePerfLogStore.getState().addEvent(evt);
  } catch {
    // Never allow telemetry to break the app.
  }
}

export function recordRouteLoadComplete(args: {
  from?: string;
  to?: string;
  destination?: string | null;
  durationMs: number;
}): void {
  recordPerfEvent({
    kind: "route",
    name: "route-load",
    from: args.from,
    to: args.to,
    destination: args.destination ?? undefined,
    durationMs: Math.max(0, Math.round(args.durationMs)),
  });
}

export function recordMilestone(args: { name: string; route?: string; sinceRouteStartMs?: number }): void {
  recordPerfEvent({
    kind: "milestone",
    name: args.name,
    route: args.route,
    sinceRouteStartMs:
      args.sinceRouteStartMs == null ? undefined : Math.max(0, Math.round(args.sinceRouteStartMs)),
  });
}

export function recordAuthTiming(args: { name: string; durationMs: number; ok?: boolean; message?: string }): void {
  recordPerfEvent({
    kind: "auth",
    name: args.name,
    durationMs: Math.max(0, Math.round(args.durationMs)),
    ok: args.ok,
    message: args.message,
  });
}

export function recordApiTiming(args: {
  name: string;
  durationMs: number;
  ok?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}): void {
  recordPerfEvent({
    kind: "api",
    name: args.name,
    durationMs: Math.max(0, Math.round(args.durationMs)),
    ok: args.ok,
    message: args.message,
    data: args.data,
  });
}

export function recordGenericTiming(args: {
  kind: Exclude<PerfEventKind, "route" | "milestone" | "auth" | "api">;
  name: string;
  durationMs: number;
  ok?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}): void {
  recordPerfEvent({
    kind: args.kind,
    name: args.name,
    route: getCurrentRoute(),
    durationMs: Math.max(0, Math.round(args.durationMs)),
    ok: args.ok,
    message: args.message,
    data: args.data,
  });
}
