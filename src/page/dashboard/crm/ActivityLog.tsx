import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { ActivityRelatedType, ActivityType } from "../../../lib/sdk/domains/crm";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

const ACTIVITY_TYPES: ActivityType[] = ["call", "meeting", "note", "task"];

/**
 * Activities logged against any one CRM record (account, contact,
 * opportunity, or lead) — the backend's own polymorphic
 * related_to_type/related_to_id, so this one component serves every
 * record page rather than one copy per record type.
 */
export function ActivityLog({
  relatedToType,
  relatedToId,
}: {
  relatedToType: ActivityRelatedType;
  relatedToId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["crm", "activities", relatedToType, relatedToId];

  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");

  const { data: activities } = useQuery({
    queryKey,
    queryFn: () => sdk.crm.listActivitiesForRecord(relatedToType, relatedToId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      sdk.crm.createActivity(relatedToType, relatedToId, {
        activity_type: activityType,
        subject: subject || undefined,
        notes: notes || undefined,
        due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSubject("");
      setNotes("");
      setDueAt("");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (activityId: string) => sdk.crm.completeActivity(activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="grid grid-cols-3 gap-2">
          <select
            className={inputClass}
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Subject…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <textarea
          className={`${inputClass} min-h-[2.5rem]`}
          placeholder="Notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex items-center gap-2">
          {activityType === "task" && (
            <input
              type="datetime-local"
              className={inputClass}
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          )}
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={(!subject.trim() && !notes.trim()) || createMutation.isPending}
            className={`flex-none ${secondaryButtonClass}`}
          >
            Log {activityType}
          </button>
          {createMutation.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">Couldn't log this activity.</p>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {activities?.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="text-neutral-700 dark:text-neutral-300">
                <span className="font-medium capitalize">{a.activity_type}</span>
                {a.subject && ` — ${a.subject}`}
              </p>
              {a.notes && <p className="mt-0.5 text-neutral-500 dark:text-neutral-500">{a.notes}</p>}
              <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-600">
                {a.due_at && `due ${new Date(a.due_at).toLocaleString()} · `}
                {a.completed_at
                  ? `done ${new Date(a.completed_at).toLocaleString()}`
                  : a.created_at
                    ? `logged ${new Date(a.created_at).toLocaleString()}`
                    : ""}
              </p>
            </div>
            {!a.completed_at && a.activity_type === "task" && (
              <button
                type="button"
                onClick={() => completeMutation.mutate(a.id)}
                disabled={completeMutation.isPending}
                className={`flex-none ${secondaryButtonClass}`}
              >
                Done
              </button>
            )}
          </li>
        ))}
        {activities?.length === 0 && (
          <li className="text-xs text-neutral-400 dark:text-neutral-600">No activity logged yet.</li>
        )}
      </ul>
    </div>
  );
}
