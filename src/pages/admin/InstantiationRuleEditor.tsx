import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

/*
 * InstantiationRuleEditor — inline rule config for a container kind or a
 * hierarchy template. Drops into ContainerKindManagementPage (target="kind") and
 * HierarchyTemplateManagementPage (target="template").
 *
 * IMPROVED: a `questionnaire` pre-condition now lets the admin pick WHICH
 * questionnaire (its config.questionnaire_id), fetched from /questionnaires.
 * Without this the questionnaire pre-condition was inert — the user side had no
 * questionnaire to render.
 *
 * target="kind"     → PUT /hierarchy/admin/instantiation-rules/{id}
 * target="template" → PUT /hierarchy/admin/instantiation-template-rules/{id}
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

type Precondition = { kind: string; config: Record<string, any> };

export function InstantiationRuleEditor({
  target,
  targetId,
}: {
  target: "kind" | "template";
  targetId: string;
}) {
  const noun = target === "template" ? "organization" : "container";

  const vocabQ = useQuery({
    queryKey: ["sub-vocab"],
    queryFn: () => api("GET", "subscriptions/admin/vocabulary"),
  });
  const plansQ = useQuery({
    queryKey: ["sub-plans"],
    queryFn: () => api("GET", "subscriptions/admin/plans"),
  });
  const questionnairesQ = useQuery({
    queryKey: ["questionnaires"],
    queryFn: () => api("GET", "questionnaires"),
  });
  const vocab = vocabQ.data ?? {
    entitlement_types: [],
    precondition_kinds: [],
  };
  const plans = Array.isArray(plansQ.data) ? plansQ.data : [];
  const questionnaires = Array.isArray(questionnairesQ.data)
    ? questionnairesQ.data
    : [];

  const [f, setF] = useState({
    enabled_by_default: true,
    requires_subscription: false,
    required_entitlement_type: "hierarchy.instantiate",
    required_plan_id: "",
    max_per_actor: "",
  });
  const [preconditions, setPreconditions] = useState<Precondition[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const setPc = (i: number, patch: Partial<Precondition>) =>
    setPreconditions((prev) =>
      prev.map((x, xi) => (xi === i ? { ...x, ...patch } : x)),
    );

  const endpoint =
    target === "template"
      ? `hierarchy/admin/instantiation-template-rules/${targetId}`
      : `hierarchy/admin/instantiation-rules/${targetId}`;

  const save = useMutation({
    mutationFn: () =>
      api("PUT", endpoint, {
        enabled_by_default: f.enabled_by_default,
        requires_subscription: f.requires_subscription,
        required_entitlement_type: f.requires_subscription
          ? f.required_entitlement_type
          : undefined,
        required_plan_id:
          f.requires_subscription && f.required_plan_id
            ? f.required_plan_id
            : undefined,
        max_per_actor: f.max_per_actor
          ? parseInt(f.max_per_actor, 10)
          : undefined,
        // Send each pre-condition with its config (questionnaire_id for questionnaire).
        preconditions: preconditions.length
          ? preconditions.map((p) => ({ kind: p.kind, config: p.config }))
          : undefined,
      }),
    onSuccess: () => setMsg("Instantiation rule saved."),
    onError: (e: Error) => setMsg(e.message),
  });

  // A judgment pre-condition (KYC/questionnaire) means this routes through admin
  // approval — worth flagging to the admin as they configure it.
  const hasJudgment = preconditions.some((p) =>
    ["kyc_approved", "questionnaire", "document"].includes(p.kind),
  );

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-2">
        Instantiation rule
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Control who can create{" "}
        {noun === "organization" ? "an organization" : "a container"} of this{" "}
        {target}, and how many. Leave everything default for unrestricted
        creation.
      </p>

      <div className="space-y-2 mb-3">
        <label className="flex items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={f.enabled_by_default}
            onChange={(e) => set("enabled_by_default", e.target.checked)}
          />
          Enabled by default (anyone may create unless individually blocked)
        </label>
        <label className="flex items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={f.requires_subscription}
            onChange={(e) => set("requires_subscription", e.target.checked)}
          />
          Requires an active subscription
        </label>
      </div>

      {f.requires_subscription && (
        <div className="grid grid-cols-2 gap-3 mb-3 pl-6">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Entitlement type
            </label>
            <select
              value={f.required_entitlement_type}
              onChange={(e) => set("required_entitlement_type", e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              {(vocab.entitlement_types ?? []).map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Specific plan (optional)
            </label>
            <select
              value={f.required_plan_id}
              onChange={(e) => set("required_plan_id", e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              <option value="">Any qualifying plan</option>
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="text-[11px] text-neutral-400 block mb-0.5">
          Max per actor (blank = no limit)
        </label>
        <input
          value={f.max_per_actor}
          onChange={(e) => set("max_per_actor", e.target.value)}
          inputMode="numeric"
          className="w-40 px-2.5 py-1.5 text-[13px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-neutral-400 block mb-1">
          Pre-conditions (must pass before creating)
        </label>
        {preconditions.map((pc, i) => (
          <div
            key={i}
            className="mb-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <select
                value={pc.kind}
                onChange={(e) => setPc(i, { kind: e.target.value, config: {} })}
                className="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              >
                {(vocab.precondition_kinds ?? []).map((k: string) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setPreconditions((prev) => prev.filter((_, xi) => xi !== i))
                }
                className="text-[11px] text-red-500 hover:text-red-600"
              >
                remove
              </button>
            </div>

            {/* Questionnaire pre-condition needs WHICH questionnaire. */}
            {pc.kind === "questionnaire" && (
              <div className="pl-1">
                <label className="text-[10px] text-neutral-400 block mb-0.5">
                  Which questionnaire?
                </label>
                <select
                  value={pc.config?.questionnaire_id ?? ""}
                  onChange={(e) =>
                    setPc(i, {
                      config: {
                        ...pc.config,
                        questionnaire_id: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                >
                  <option value="">Select a questionnaire…</option>
                  {questionnaires.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
                {!pc.config?.questionnaire_id && (
                  <p className="text-[10px] text-amber-600 mt-0.5 m-0">
                    Pick a questionnaire, or this pre-condition can't be
                    satisfied.
                  </p>
                )}
                {questionnaires.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-0.5 m-0">
                    No questionnaires exist yet — create one on the
                    Questionnaires page first.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {(vocab.precondition_kinds ?? []).length > 0 && (
          <button
            onClick={() =>
              setPreconditions((prev) => [
                ...prev,
                { kind: vocab.precondition_kinds[0], config: {} },
              ])
            }
            className="text-[11px] text-neutral-500 hover:text-neutral-700 underline"
          >
            + add pre-condition
          </button>
        )}
      </div>

      {hasJudgment && (
        <div className="mb-3 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 text-[11px] text-blue-700 dark:text-blue-400">
          This rule has a pre-condition needing review — creating this {noun}{" "}
          will require <strong>admin approval</strong> (the user submits a
          request; you approve it in Instantiation Requests).
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Save rule"}
        </button>
        {msg && <span className="text-[11px] text-neutral-500">{msg}</span>}
      </div>
    </div>
  );
}
