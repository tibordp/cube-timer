import React from "react";

export function useWakeLock(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) {
      return () => {};
    }

    var sentinel: WakeLockSentinel | undefined;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        console.info("We have the wake lock.");
        sentinel.addEventListener("release", () => {
          console.info("We no longer have the wake lock.");
        });
      } catch (e) {
        console.error(e);
      }
    };
    acquire();

    return () => {
      sentinel?.release();
    };
  }, [enabled]);
}
