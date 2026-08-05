import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { churchApi as api, fmtDate } from "./crm-api";

type Journey = {
  id: string;
  stage: string;
  decision_source: string | null;
  decision_date: string | null;
  contact: { display_name: string; phone: string | null } | null;
};

const STAGES = [
  "new",
  "contacted",
  "first_visit",
  "discipleship",
  "baptism_prep",
  "member",
  "inactive",
];

/** Church CRM extension — new-believer follow-up (composes over base CRM). */
export default function ChurchCrmWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    decision_source: "crusade",
  });

  const journeys = useQuery({
    queryKey: ["church", "believers", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/believers`),
  });

  const register = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/believers`, {
        name: form.name.trim(),
        phone: form.phone || null,
        decision_source: form.decision_source,
      }),
    onSuccess: () => {
      setForm({ ...form, name: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["church", "believers", containerId] });
    },
  });
  const advance = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api("POST", `/containers/${containerId}/believers/${id}/advance`, {
        stage,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["church", "believers", containerId] }),
  });

  const list: Journey[] = Array.isArray(journeys.data) ? journeys.data : [];
  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4">
      <div className="text-[11px] text-neutral-400">
        New believers are stored as CRM contacts (type “believer”) and tracked
        here through follow-up to membership.
      </div>

      {can("system.crm.church.followup.manage") && (
        <div className="flex flex-wrap gap-2 border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Believer name"
            className={`${input} flex-1 min-w-40`}
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
            className={`${input} w-40`}
          />
          <select
            value={form.decision_source}
            onChange={(e) =>
              setForm({ ...form, decision_source: e.target.value })
            }
            className={input}
          >
            {["crusade", "service", "personal", "online", "other"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => register.mutate()}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Register
          </button>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No believers yet.
          </div>
        ) : (
          list.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div>
                <div className="text-sm text-black dark:text-white">
                  {j.contact?.display_name ?? "—"}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {j.contact?.phone || "—"} · {j.decision_source || "—"} ·{" "}
                  {fmtDate(j.decision_date)}
                </div>
              </div>
              {can("system.crm.church.followup.manage") ? (
                <select
                  value={j.stage}
                  onChange={(e) =>
                    advance.mutate({ id: j.id, stage: e.target.value })
                  }
                  className={`${input} text-xs`}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {j.stage.replace("_", " ")}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
