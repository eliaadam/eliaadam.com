import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { tracker, type TrackerStatus } from "../../lib/analytics";
import { useAnalyticsStatus } from "./useAnalyticsStatus";

const STATUS_TEXT: Record<TrackerStatus, string> = {
  active: "Usage statistics are being collected from this browser.",
  opted_out: "You've turned usage statistics off for this browser.",
  do_not_track: "Your browser's Do Not Track / Global Privacy Control setting is on, so nothing is collected.",
  disabled: "Usage statistics are switched off by the administrator.",
  sampled_out: "This visit isn't part of the sample being measured, so nothing is collected.",
  not_started: "Usage statistics haven't started yet.",
};

const buttonClass = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60";

/**
 * A person's own controls over usage statistics: see whether they're on, switch them off for this browser, and
 * delete what's been collected about their account. Put it on the "My Settings" page.
 *
 * What's collected: which pages you open and for how long, which parts of a page you see and use, and errors you hit —
 * never what you type, never what's written on a button, never search terms.
 */
export function AnalyticsPrivacyControls() {
  const status = useAnalyticsStatus();
  const [confirming, setConfirming] = useState(false);
  const erase = useMutation({ mutationFn: () => sdk.analytics.eraseMe(), onSuccess: () => setConfirming(false) });
  const optedOut = status === "opted_out";
  const forced = status === "do_not_track";

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">Usage statistics</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{STATUS_TEXT[status]}</p>
      <p className="mt-2 text-xs text-neutral-500">
        We measure which pages are opened, for how long, and which parts of a page are seen and used — to make the product better. We never record what you type,
        what is written on buttons, or what you search for.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={optedOut} disabled={forced} onChange={(e) => tracker.setOptOut(e.target.checked)} />
        Don't collect usage statistics from this browser
      </label>

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-900">
        <p className="text-sm font-medium">Delete what's been collected about me</p>
        <p className="mt-1 text-xs text-neutral-500">Removes the usage data tied to your account, including browsing from this browser before you signed in.</p>
        {erase.isSuccess ? (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">Done — removed {erase.data.events} event{erase.data.events === 1 ? "" : "s"}.</p>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" disabled={erase.isPending} onClick={() => (confirming ? erase.mutate() : setConfirming(true))}
              className={`${buttonClass} ${confirming ? "bg-red-600 text-white hover:bg-red-700" : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"}`}>
              {erase.isPending ? "Deleting…" : confirming ? "Yes, delete my usage data" : "Delete my usage data"}
            </button>
            {confirming && !erase.isPending && <button type="button" className={`${buttonClass} text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900`} onClick={() => setConfirming(false)}>Cancel</button>}
          </div>
        )}
        {erase.isError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erase.error instanceof ApiError ? erase.error.message : "Couldn't delete it right now."}</p>}
      </div>
    </section>
  );
}
