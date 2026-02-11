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
