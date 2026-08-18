import { useEffect, useRef, useState } from "react";

type PollState = "idle" | "polling" | "succeeded" | "failed" | "timeout";

/**
 * Polls a status function until it returns a terminal payment_status. Works for
 * both the authenticated intent poll and the public charge-token poll — pass any
 * async fn returning { payment_status }.
 */
export function usePaymentPoll(
  fetchStatus: (() => Promise<{ payment_status: string }>) | null,
  opts: { intervalMs?: number; timeoutMs?: number; onSucceeded?: () => void } = {},
) {
  const { intervalMs = 4000, timeoutMs = 180000, onSucceeded } = opts;
  const [state, setState] = useState<PollState>("idle");
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!fetchStatus) return;
    setState("polling");
    startedAt.current = Date.now();

    const tick = async () => {
      if (Date.now() - startedAt.current > timeoutMs) {
        setState("timeout");
        if (timer.current) clearInterval(timer.current);
        return;
      }
      try {
        const { payment_status } = await fetchStatus();
        if (payment_status === "succeeded") {
          setState("succeeded");
          onSucceeded?.();
          if (timer.current) clearInterval(timer.current);
        } else if (payment_status === "failed") {
          setState("failed");
          if (timer.current) clearInterval(timer.current);
        }
      } catch {
        // transient — keep polling until timeout
      }
    };

    timer.current = setInterval(tick, intervalMs);
    tick();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus]);

  return state;
}
