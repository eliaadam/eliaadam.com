import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SubscribePanel from "./SubscribePanel";
import { QuestionnaireFiller } from "../../pages/user/panels/QuestionnaireFiller";
 
const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
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
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.body = j;
    throw e;
  }
  return j.data ?? j;
}

type Precondition = {
  kind: string;
  description?: string;
  config?: any;
  satisfied?: boolean;
};
type Decision = {
  allowed: boolean;
  reason: string | null;
  requires_subscription: boolean;
  requires_approval?: boolean;
  satisfying_subscription_id: string | null;
  unmet_preconditions: Precondition[];
  preconditions?: Precondition[];
  cap: number | null;
  current_count: number | null;
};

export default function InstantiationGate({
  kindId,
  templateId,
  entitlementType = "hierarchy.instantiate",
  children,
}: {
  kindId?: string;
  templateId?: string;
  entitlementType?: string;
  children: React.ReactNode;
}) {
  const [showSubscribe, setShowSubscribe] = useState(false);

  const target = templateId
    ? {
        type: "template" as const,
        id: templateId,
        key: ["can-instantiate-template", templateId],
        path: `hierarchy/hierarchy-templates/${templateId}/can-instantiate`,
      }
    : {
        type: "kind" as const,
        id: kindId!,
        key: ["can-instantiate", kindId],
        path: `hierarchy/kinds/${kindId}/can-instantiate`,
      };

  const q = useQuery({
    queryKey: target.key,
    queryFn: () => api("GET", target.path) as Promise<Decision>,
    enabled: Boolean(templateId || kindId),
  });

  if (q.isLoading)
    return (
      <p className="text-sm text-neutral-400">
        Checking whether you can create this…
      </p>
    );
  if (q.isError) return <>{children}</>; // fail open on the hint; backend still enforces

  const d = q.data as Decision;

  // Allowed → automatic path, show the real form.
  if (d.allowed) return <>{children}</>;

  // Approval path — judgment pre-conditions → submit a request.
  if (d.requires_approval) {
    return <RequestFlow target={target} decision={d} />;
  }

  // Automatic-but-blocked (subscription / cap).
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-5 max-w-2xl">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Before you can create this
      </p>
      <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0 mb-4">
        {d.reason ?? "Some requirements aren't met yet."}
      </p>

      {d.cap !== null &&
        d.current_count !== null &&
        d.current_count >= d.cap && (
          <p className="text-[13px] text-neutral-700 dark:text-neutral-300 m-0 mb-4">
            You've created {d.current_count} of your {d.cap} allowed. Delete
            one, or ask an administrator to raise your limit.
          </p>
        )}

      {d.requires_subscription &&
        (!showSubscribe ? (
          <button
            onClick={() => setShowSubscribe(true)}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            View subscription options
          </button>
        ) : (
          <div className="mt-2">
            <p className="text-[11px] text-neutral-500 m-0 mb-3">
              Subscribe to a plan that grants this, then return to create.
            </p>
            <SubscribePanel entitlementType={entitlementType} />
          </div>
        ))}

      <button
        onClick={() => window.location.reload()}
        className="block mt-4 text-[11px] text-neutral-400 hover:text-neutral-600 underline"
      >
        I've completed the requirements — re-check
      </button>
    </div>
  );
}

/* ── APPROVAL PATH: complete evidence → submit request ────────────── */

function RequestFlow({
  target,
  decision,
}: {
  target: { type: "template" | "kind"; id: string };
  decision: Decision;
}) {
  const preconditions =
    decision.preconditions ?? decision.unmet_preconditions ?? [];
  const kycNeeded = preconditions.some((p) => p.kind === "kyc_approved");
  const questionnaire = preconditions.find((p) => p.kind === "questionnaire");
  const questionnaireId = questionnaire?.config?.questionnaire_id;
 
  const needsSubscription =
    Boolean(decision.requires_subscription) &&
    !decision.satisfying_subscription_id;
  const [subscribed, setSubscribed] = useState<boolean>(!needsSubscription);

  const [questionnaireResponseId, setQuestionnaireResponseId] = useState<
    string | null
  >(null);
  const [params, setParams] = useState({
    code_prefix: "",
    display_name_prefix: "",
    visibility: "private",
  });
  const [submitted, setSubmitted] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const setP = (k: string, v: string) => setParams((p) => ({ ...p, [k]: v }));

  const submit = useMutation({
    mutationFn: () =>
      api("POST", "hierarchy/instantiation-requests", {
        target_type: target.type,
        target_id: target.id,
        parameters: params,
        questionnaire_response_id: questionnaireResponseId ?? undefined,
      }),
    onSuccess: (data) => setSubmitted(data),
    onError: (e: any) => setMsg(e.body?.message ?? e.message),
  });

  // Ready to submit when the questionnaire (if the rule has one) is answered.
  // If a questionnaire pre-condition exists but has no configured id, it can't
  // be answered → not ready (the amber notice tells the user why).
  const questionnaireReady = !questionnaire || Boolean(questionnaireResponseId);
  const paramsReady =
    params.code_prefix.trim() && params.display_name_prefix.trim();
  const subscriptionReady = subscribed;

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-5 max-w-2xl">
        <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
          Request submitted
        </p>
        <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0">
          Your request to create this is now pending review. An administrator
          will approve it, and it'll be created then. You can track it under "My
          requests".
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 max-w-2xl">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        This requires approval
      </p>
      <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0 mb-4">
        Creating this needs a few things reviewed by an administrator. Complete
        them below and submit a request.
      </p>

      {/* subscription step — must be satisfied before the request can be
          submitted, because approval re-checks it and will refuse otherwise. */}
      {needsSubscription && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-2">
            1 · Subscription
          </p>
          {subscribed ? (
            <p className="text-[12px] text-emerald-600 m-0">
              ✓ Active subscription in place.
            </p>
          ) : (
            <>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 m-0 mb-2">
                Creating this type of organization requires an active
                subscription. Choose a plan to continue.
              </p>
              <SubscribePanel
                entitlementType="hierarchy.instantiate"
                onSubscribed={() => setSubscribed(true)}
              />
            </>
          )}
        </div>
      )}

      {/* KYC step */}
      {kycNeeded && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-1">
            {needsSubscription ? 2 : 1} · Identity verification (KYC)
          </p>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-300 m-0">
            Make sure your KYC is submitted and approved (do this in the KYC
            section). Your approved record is attached automatically.
          </p>
        </div>
      )}

      {/* questionnaire step — render whenever a questionnaire pre-condition
          exists, even if its id is missing, so the problem is never silent. */}
      {questionnaire && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-2">
            {(needsSubscription ? 1 : 0) + (kycNeeded ? 1 : 0) + 1} ·
            Questionnaire
          </p>
          {!questionnaireId ? (
            <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-700 dark:text-amber-400">
              This template requires a questionnaire, but no specific
              questionnaire is configured on its rule. Ask an administrator to
              open the template's Rules and select a questionnaire for the
              questionnaire pre-condition.
            </div>
          ) : questionnaireResponseId ? (
            <p className="text-[12px] text-emerald-600 m-0">
              ✓ Questionnaire submitted.
            </p>
          ) : (
            <QuestionnaireFiller
              questionnaireId={questionnaireId}
              contextType="instantiation_request"
              onSubmitted={(rid) => setQuestionnaireResponseId(rid)}
            />
          )}
        </div>
      )}

      {/* instantiation params */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-2">
          {(needsSubscription ? 1 : 0) +
            (kycNeeded ? 1 : 0) +
            (questionnaireId ? 1 : 0) +
            1}{" "}
          · Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Code
            </label>
            <input
              value={params.code_prefix}
              onChange={(e) =>
                setP(
                  "code_prefix",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              placeholder="acme"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Name
            </label>
            <input
              value={params.display_name_prefix}
              onChange={(e) => setP("display_name_prefix", e.target.value)}
              placeholder="Acme Corp"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Visibility
            </label>
            <select
              value={params.visibility}
              onChange={(e) => setP("visibility", e.target.value)}
              className={inputCls}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={() => submit.mutate()}
        disabled={
          submit.isPending ||
          !subscriptionReady ||
          !questionnaireReady ||
          !paramsReady
        }
        className="px-5 py-2.5 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {submit.isPending ? "Submitting…" : "Submit request for approval"}
      </button>
      {!subscriptionReady && (
        <p className="text-[11px] text-amber-600 mt-1 m-0">
          An active subscription is required before you can submit.
        </p>
      )}
      {!questionnaireReady && (
        <p className="text-[11px] text-amber-600 mt-1 m-0">
          Complete the questionnaire first.
        </p>
      )}
      {msg && <p className="text-[11px] text-red-600 mt-1 m-0">{msg}</p>}
    </div>
  );
}
