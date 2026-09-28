import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { PostingAttempt } from "../../../lib/sdk/domains/finance";
import { badgeClass, cardClass, dangerButtonClass, errorMessage, errorTextClass, formatDateTime, inputClass, primaryButtonClass, secondaryButtonClass } from "./ui";

const REASON_LABEL: Record<string, string> = {
  books_not_opened: "The books aren't open yet.",
  missing_mappings: "One or more account roles aren't mapped.",
  period_closed: "The date falls in a closed period.",
  invalid_account: "An account involved can't be posted to.",
  vetoed: "A posting rule refused this.",
  unknown_role: "An unknown account role was used — likely a bug in the rule.",
  invalid_draft: "The rule produced an invalid journal.",
  no_container: "The message didn't say which container it belongs to.",
};

/**
 * Postings that arrived automatically (from elsewhere in the system) but
 * couldn't complete on their own — usually because something isn't set up
 * yet (an unmapped role, a closed period). Fix the cause, then replay.
 */
export function PostingQueueTab({ containerId }: { containerId: string }) {
  const { data: attempts, isLoading, error } = useQuery({
    queryKey: ["finance", "posting-queue", containerId],
    queryFn: () => sdk.finance.listPostingQueue(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Nothing here is lost — each of these is waiting on a fix (map a role, reopen a period…). Replay re-runs it
        once you've made the fix; dismiss if it shouldn't post at all.
      </p>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load the posting queue.")}</p>}

      {attempts && (
        <ul className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {attempts.map((a) => (
            <AttemptRow key={a.id} containerId={containerId} attempt={a} />
          ))}
          {attempts.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">Nothing waiting — the queue is empty.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function AttemptRow({ containerId, attempt }: { containerId: string; attempt: PostingAttempt }) {
  const queryClient = useQueryClient();
  const [dismissing, setDismissing] = useState(false);
  const [note, setNote] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance", "posting-queue", containerId] });
  const replay = useMutation({ mutationFn: () => sdk.finance.replayPosting(containerId, attempt.id), onSuccess: refresh });
  const dismiss = useMutation({ mutationFn: () => sdk.finance.dismissPosting(containerId, attempt.id, note), onSuccess: refresh });

  const roles = Array.isArray(attempt.detail.roles) ? (attempt.detail.roles as string[]) : [];
  const message = typeof attempt.detail.message === "string" ? attempt.detail.message : "";

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={badgeClass}>{attempt.rule_key}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">{formatDateTime(attempt.created_at)}</span>
        <span className="text-xs text-neutral-400 dark:text-neutral-600">· {attempt.attempts} attempt{attempt.attempts === 1 ? "" : "s"}</span>
      </div>
      <p className="text-sm">{REASON_LABEL[attempt.reason] ?? attempt.reason}</p>
      {roles.length > 0 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Unmapped roles: {roles.map((r) => (
            <span key={r} className={`${badgeClass} ml-1`}>{r}</span>
          ))}
        </p>
      )}
      {message && <p className="text-xs text-neutral-500 dark:text-neutral-500">{message}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => replay.mutate()} disabled={replay.isPending} className={primaryButtonClass}>
          {replay.isPending ? "Replaying…" : "Replay"}
        </button>
        {dismissing ? (
          <>
            <input className={`${inputClass} w-56`} placeholder="Why dismiss this? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" onClick={() => dismiss.mutate()} disabled={dismiss.isPending} className={dangerButtonClass}>
              {dismiss.isPending ? "Dismissing…" : "Confirm dismiss"}
            </button>
            <button type="button" onClick={() => setDismissing(false)} className={secondaryButtonClass}>Cancel</button>
          </>
        ) : (
          <button type="button" onClick={() => setDismissing(true)} className={secondaryButtonClass}>Dismiss</button>
        )}
        {(replay.isError || dismiss.isError) && <p className={errorTextClass}>{errorMessage(replay.error ?? dismiss.error, "That action was refused.")}</p>}
      </div>
    </li>
  );
}
