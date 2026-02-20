export const waitForIdleAndPaint = () =>
    new Promise((resolve) => {
        const scheduleIdle =
            window.requestIdleCallback ||
            ((cb) =>
                setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 50));

        scheduleIdle(() => {
            // ensure at least one paint after idle
            requestAnimationFrame(() => resolve(() => {}));
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
