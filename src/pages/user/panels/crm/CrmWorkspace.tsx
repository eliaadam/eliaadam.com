import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi as api, fmtDate } from "./crm-api";

type Contact = {
  id: string;
  display_name: string;
  type_code: string | null;
  stage_code: string | null;
  email: string | null;
  phone: string | null;
  updated_at: string;
};
type Cat = { id: string; code: string; name: string };

/** Base CRM — contacts list, quick-add, and stage/type filters. */
export default function CrmWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({
    display_name: "",
    type_code: "",
    phone: "",
  });

  const contacts = useQuery({
    queryKey: ["crm", "contacts", containerId, q, typeFilter],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/contacts?q=${encodeURIComponent(q)}${typeFilter ? `&type_code=${typeFilter}` : ""}`,
      ),
  });
  const types = useQuery({
    queryKey: ["crm", "types", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/types`),
  });
  const stages = useQuery({
    queryKey: ["crm", "stages", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/stages`),
  });

  const create = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/contacts`, {
        display_name: form.display_name.trim(),
        type_code: form.type_code || null,
        phone: form.phone || null,
      }),
    onSuccess: () => {
      setForm({ display_name: "", type_code: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["crm", "contacts", containerId] });
    },
  });
  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api("POST", `/containers/${containerId}/contacts/${id}/stage`, {
        stage_code: stage,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["crm", "contacts", containerId] }),
  });

  const list: Contact[] = Array.isArray(contacts.data) ? contacts.data : [];
  const typeList: Cat[] = Array.isArray(types.data) ? types.data : [];
  const stageList: Cat[] = Array.isArray(stages.data) ? stages.data : [];
  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name/email/phone"
          className={`${input} flex-1 min-w-48`}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={input}
        >
          <option value="">All types</option>
          {typeList.map((t) => (
            <option key={t.id} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {can("system.crm.contact.manage") && (
        <div className="flex flex-wrap gap-2 border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
          <input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="Name"
            className={`${input} flex-1 min-w-40`}
          />
          <select
            value={form.type_code}
            onChange={(e) => setForm({ ...form, type_code: e.target.value })}
            className={input}
          >
            <option value="">Type…</option>
            {typeList.map((t) => (
              <option key={t.id} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
            className={`${input} w-40`}
          />
          <button
            onClick={() => create.mutate()}
            disabled={!form.display_name.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Add contact
          </button>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">No contacts.</div>
        ) : (
          list.map((ct) => (
            <div
              key={ct.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div>
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {ct.display_name}
                  {ct.type_code && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {ct.type_code}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {ct.phone || ct.email || "—"} · {fmtDate(ct.updated_at)}
                </div>
              </div>
              {stageList.length > 0 && can("system.crm.contact.manage") && (
                <select
                  value={ct.stage_code ?? ""}
                  onChange={(e) =>
                    move.mutate({ id: ct.id, stage: e.target.value })
                  }
                  className={`${input} text-xs`}
                >
                  <option value="">Stage…</option>
                  {stageList.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
