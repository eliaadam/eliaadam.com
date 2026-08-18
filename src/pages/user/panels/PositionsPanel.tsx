import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrApi as api, toMinor, toMajor } from "./hr-api";

const PLATFORM_API =
  import.meta.env.VITE_PLATFORM_API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";

// Fetch the container's grantable roles (the SAME vocabulary the Members panel
// uses) so a position can only bundle roles the container actually has.
async function fetchGrantableRoles(containerId: string) {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(
    `${PLATFORM_API}/api/hierarchy/containers/${containerId}/grantable-roles`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  return j.data ?? j ?? [];
}

type GrantableRole = {
  code: string;
  display_name: string;
  is_wildcard: boolean;
  permission_count: number | null;
};

type Position = {
  id: string;
  title: string;
  grade: string | null;
  headcount: number;
  status: string;
  grants_roles: string[] | string | null;
  default_compensation_type: string;
  default_compensation: any;
};

const COMP_TYPES = [
  { value: "none", label: "Unpaid" },
  { value: "fixed_periodic", label: "Salary" },
  { value: "metered", label: "Metered (tokens/usage)" },
];

/**
 * Positions — the role↔position bridge lives here. Each position declares the
 * role(s) it grants and a default compensation. Assigning an actor to a position
 * (in Roster → hire) then seats + grants those roles automatically.
 *
 * This is the actor-type-agnostic workforce spine: a "Cashier" (salary, grants
 * 'cashier') and a "Data Analyst Agent" (metered, grants 'analyst') are the same
 * structure — a position with roles and a cost.
 */
export default function PositionsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const canManage = can("system.hr.position.create");

  const positions = useQuery({
    queryKey: ["hr", "positions", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/positions`),
  });

  const list: Position[] = Array.isArray(positions.data) ? positions.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canManage && (
        <PositionForm
          containerId={containerId}
          onSaved={(m) => {
            setMsg(m);
            qc.invalidateQueries({
              queryKey: ["hr", "positions", containerId],
            });
          }}
        />
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {positions.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No positions yet.
          </div>
        ) : (
          list.map((p) => {
            const roles = normalizeRoles(p.grants_roles);
            const comp = compLabel(
              p.default_compensation_type,
              p.default_compensation,
            );
            return (
              <div key={p.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-black dark:text-white">
                    {p.title}
                    <span className="text-[11px] text-neutral-400">
                      {p.grade ? ` · ${p.grade}` : ""} · {p.headcount} seat(s)
                      {p.status !== "active" ? ` · ${p.status}` : ""}
                    </span>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setEditing(editing === p.id ? null : p.id)}
                      className="text-[11px] text-neutral-500 hover:underline"
                    >
                      {editing === p.id ? "Close" : "Edit"}
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 items-center">
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      >
                        grants: {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-400">
                      grants no roles
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {comp}
                  </span>
                </div>

                {editing === p.id && canManage && (
                  <div className="mt-3">
                    <PositionForm
                      containerId={containerId}
                      existing={p}
                      onSaved={(m) => {
                        setMsg(m);
                        setEditing(null);
                        qc.invalidateQueries({
                          queryKey: ["hr", "positions", containerId],
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Create/edit form — title, grade, headcount, grants_roles chips, compensation. */
function PositionForm({
  containerId,
  existing,
  onSaved,
}: {
  containerId: string;
  existing?: Position;
  onSaved: (msg: string) => void;
}) {
  const isEdit = !!existing;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [grade, setGrade] = useState(existing?.grade ?? "");
  const [headcount, setHeadcount] = useState(String(existing?.headcount ?? 1));
  const [roles, setRoles] = useState<string[]>(
    normalizeRoles(existing?.grants_roles),
  );
  const grantable = useQuery({
    queryKey: ["hr", "grantable-roles", containerId],
    queryFn: () => fetchGrantableRoles(containerId) as Promise<GrantableRole[]>,
  });
  const [compType, setCompType] = useState(
    existing?.default_compensation_type ?? "none",
  );
  const dc = existing?.default_compensation ?? {};
  const [amount, setAmount] = useState(
    dc?.amount ? String(dc.amount / 100) : "",
  );
  const [currency, setCurrency] = useState(dc?.currency ?? "TZS");
  const [period, setPeriod] = useState(dc?.period ?? "month");
  const [rate, setRate] = useState(dc?.rate ? String(dc.rate / 100) : "");
  const [unit, setUnit] = useState(dc?.unit ?? "token");
  const [budget, setBudget] = useState(
    dc?.budget ? String(dc.budget / 100) : "",
  );

  const toggleRole = (code: string) => {
    setRoles(
      roles.includes(code) ? roles.filter((r) => r !== code) : [...roles, code],
    );
  };

  const buildComp = () => {
    if (compType === "fixed_periodic")
      return {
        type: "fixed_periodic",
        amount: toMinor(amount),
        currency,
        period,
      };
    if (compType === "metered")
      return {
        type: "metered",
        rate: toMinor(rate),
        unit,
        budget: budget ? toMinor(budget) : null,
        currency,
      };
    return null;
  };

  const save = useMutation({
    mutationFn: () => {
      const body: any = {
        title: title.trim(),
        grade: grade.trim() || null,
        headcount: Number(headcount) || 1,
        grants_roles: roles,
        default_compensation_type: compType,
        default_compensation: buildComp(),
      };
      return isEdit
        ? api(
            "PATCH",
            `/containers/${containerId}/positions/${existing!.id}`,
            body,
          )
        : api("POST", `/containers/${containerId}/positions`, body);
    },
    onSuccess: () =>
      onSaved(isEdit ? "Position updated." : "Position created."),
  });

  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Position title"
          className={`${input} flex-1 min-w-[160px]`}
        />
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Grade"
          className={`${input} w-24`}
        />
        <input
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
          type="number"
          min="1"
          placeholder="Seats"
          className={`${input} w-20`}
        />
      </div>

      {/* Role → position mapping — pick from the container's ACTUAL roles. */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-500 mb-1">
          Grants roles{" "}
          <span className="text-neutral-400">
            — holding this position confers these roles (and their permissions)
          </span>
        </label>
        {grantable.isLoading ? (
          <p className="text-[11px] text-neutral-400">Loading roles…</p>
        ) : (grantable.data ?? []).filter((r) => !r.is_wildcard).length ===
          0 ? (
          <p className="text-[11px] text-neutral-400">
            No grantable roles in this container. Create roles first, or you may
            not have permission to grant any.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(grantable.data ?? [])
              .filter((r) => !r.is_wildcard)
              .map((r) => {
                const on = roles.includes(r.code);
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => toggleRole(r.code)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      on
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                        : "bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                    title={
                      r.permission_count != null
                        ? `${r.permission_count} permissions`
                        : "all permissions"
                    }
                  >
                    {on ? "✓ " : ""}
                    {r.display_name}
                  </button>
                );
              })}
          </div>
        )}
        {/* Preserve any stored codes no longer in the grantable set (e.g. a role
            you can't currently grant) so editing doesn't silently drop them. */}
        {roles
          .filter((c) => !(grantable.data ?? []).some((r) => r.code === c))
          .map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 mt-1 mr-1 text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
            >
              {c} (not grantable by you)
              <button
                onClick={() => toggleRole(c)}
                className="text-neutral-400 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
      </div>

      {/* Compensation */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-500 mb-1">
          Default compensation
        </label>
        <select
          value={compType}
          onChange={(e) => setCompType(e.target.value)}
          className={`${input} mb-2`}
        >
          {COMP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {compType === "fixed_periodic" && (
          <div className="flex flex-wrap gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder="Amount"
              className={`${input} w-28`}
            />
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="TZS"
              className={`${input} w-20`}
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={input}
            >
              {["hour", "week", "month", "year"].map((p) => (
                <option key={p} value={p}>
                  per {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {compType === "metered" && (
          <div className="flex flex-wrap gap-2">
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              type="number"
              placeholder="Rate"
              className={`${input} w-24`}
            />
            <span className="text-xs text-neutral-400 self-center">per</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="token"
              className={`${input} w-24`}
            />
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              type="number"
              placeholder="Budget (optional)"
              className={`${input} w-32`}
            />
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="TZS"
              className={`${input} w-20`}
            />
          </div>
        )}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={!title.trim() || save.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {isEdit ? "Save changes" : "Create position"}
      </button>
      {save.isError && (
        <span className="ml-2 text-xs text-red-600">
          {(save.error as any)?.message}
        </span>
      )}
    </div>
  );
}

function normalizeRoles(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

function compLabel(type: string, dc: any): string {
  if (!type || type === "none") return "unpaid";
  const d = typeof dc === "string" ? safeParse(dc) : dc;
  if (type === "fixed_periodic")
    return `${toMajor(d?.amount ?? 0)} ${d?.currency ?? ""}/${d?.period ?? "month"}`;
  if (type === "metered")
    return `${toMajor(d?.rate ?? 0)} ${d?.currency ?? ""}/${d?.unit ?? "token"}${d?.budget ? ` · budget ${toMajor(d.budget)}` : ""}`;
  return type;
}
function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
