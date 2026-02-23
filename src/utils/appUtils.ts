export const waitForIdleAndPaint = () =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(() => {});
    };

    // Safety net: never hang forever (e.g. background tab can throttle rAF).
    const hardTimeoutId = window.setTimeout(finish, 750);

    type IdleDeadlineLike = { didTimeout: boolean; timeRemaining: () => number };
    type ScheduleIdle = (cb: (deadline: IdleDeadlineLike) => void) => number;

    const scheduleIdle: typeof window.requestIdleCallback | ScheduleIdle =
      window.requestIdleCallback ||
      ((cb: (deadline: IdleDeadlineLike) => void) =>
        window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 50));

    scheduleIdle(() => {
      if (done) return;

      // If the document is hidden, rAF may not fire; resolve once idle.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        window.clearTimeout(hardTimeoutId);
        finish();
        return;
      }

      let rafId: number | null = null;
      const softTimeoutId = window.setTimeout(() => {
        if (rafId != null) window.cancelAnimationFrame(rafId);
        window.clearTimeout(hardTimeoutId);
        finish();
      }, 250);

      rafId = window.requestAnimationFrame(() => {
        window.clearTimeout(softTimeoutId);
        window.clearTimeout(hardTimeoutId);
        finish();
      });
    });
  });

export const errorToMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    // Amplify often throws `{ data, errors }` for GraphQL failures.
    if ("errors" in err && Array.isArray((err as { errors?: unknown }).errors)) {
      const errors = (err as { errors: Array<{ message?: unknown; errorType?: unknown }> }).errors;
      const messages = errors
        .map((e) => {
          const msg = typeof e?.message === "string" ? e.message : "Unknown GraphQL error";
          const type = typeof e?.errorType === "string" ? e.errorType : "";
          return type ? `${msg} (${type})` : msg;
        })
        .filter(Boolean);
      if (messages.length) return messages.join("; ");
    }

    if ("message" in err) return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}
