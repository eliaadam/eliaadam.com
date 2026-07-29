import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../../lib/maicore";

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
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

const STATUSES = ["pending_review", "approved", "rejected", "failed"];

export function InstantiationRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending_review");

  const q = useQuery({
    queryKey: ["admin", "inst-requests", status],
    queryFn: () =>
      api("GET", `hierarchy/admin/instantiation-requests?status=${status}`),
  });
  const rows: any[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">
        Instantiation Requests
      </h1>
      <p className="text-sm text-neutral-500 mt-1 mb-5">
        Requests to create containers gated by KYC or questionnaire. Review the
        evidence, then approve to create — or reject.
      </p>

      <div className="flex gap-1 mb-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
              status === s
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">
            No {status.replace("_", " ")} requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              onChanged={() =>
                qc.invalidateQueries({ queryKey: ["admin", "inst-requests"] })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, onChanged }: { req: any; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const actorQ = useQuery({
    queryKey: ["actor-name", req.actor_id],
    queryFn: () => userApi.searchActors(req.actor_id),
    enabled: expanded,
  });
  const actorName = Array.isArray(actorQ.data)
    ? actorQ.data.find((a: any) => a.id === req.actor_id)?.display_name
    : undefined;

  // Full review detail (questionnaire answers expanded) loaded on demand.
  const detailQ = useQuery({
    queryKey: ["inst-request-detail", req.id],
    queryFn: () =>
      api("GET", `hierarchy/admin/instantiation-requests/${req.id}`),
    enabled: expanded,
  });
  const detail = detailQ.data;

  const act = async (action: "approve" | "reject") => {
    setBusy(action);
    setMsg(null);
    try {
      await api(
        "POST",
        `hierarchy/admin/instantiation-requests/${req.id}/${action}`,
        action === "reject"
          ? { note: reason.trim() }
          : { note: reason.trim() || undefined },
      );
      onChanged();
      setMsg(
        action === "approve"
          ? "Approved — instantiation performed."
          : "Rejected.",
      );
      setRejecting(false);
      setReason("");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-black dark:text-white m-0">
            {req.target_type === "template" ? "Organization" : "Container"}{" "}
            request
            <span className="text-[11px] font-normal text-neutral-400 ml-2">
              {req.target_type}: {req.target_id.slice(0, 8)}…
            </span>
          </p>
          <p className="text-[11px] text-neutral-400 m-0">
            by {actorName ?? req.actor_id.slice(0, 12) + "…"} ·{" "}
            {new Date(req.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReqStatus status={req.status} />
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
          >
            {expanded ? "hide" : "review"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          {/* instantiation parameters */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0 mb-1">
              Requested parameters
            </p>
            <div className="text-[11px] text-neutral-600 dark:text-neutral-300 font-mono">
              {Object.entries(req.parameters ?? {}).map(([k, v]) => (
                <div key={k}>
                  {k}: {String(v)}
                </div>
              ))}
            </div>
          </div>

          {/* KYC evidence */}
          {req.kyc_record_id && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0 mb-1">
                KYC
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 m-0">
                Record {req.kyc_record_id.slice(0, 12)}… — review in the KYC
                Review page.
              </p>
            </div>
          )}

          {/* questionnaire answers, expanded */}
          {detail?.questionnaire_review && (
            <QuestionnaireReview review={detail.questionnaire_review} />
          )}
          {detailQ.isLoading && (
            <p className="text-[11px] text-neutral-400 m-0">
              Loading evidence…
            </p>
          )}
        </div>
      )}

      {/* failure reason — shown above the actions so the admin sees why before retrying */}
      {req.status === "failed" && (
        <p className="text-[11px] text-red-600 mt-2 m-0">
          {req.review_note ?? "Instantiation failed."} — you can retry (re-run
          creation) or reject.
        </p>
      )}

      {/* actions — available for pending requests AND failed ones (retry) */}
      {(req.status === "pending_review" || req.status === "failed") && (
        <div className="flex gap-2 mt-3">
          {!rejecting ? (
            <>
              <button
                onClick={() => act("approve")}
                disabled={busy !== null}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-40"
              >
                {busy === "approve"
                  ? req.status === "failed"
                    ? "Retrying…"
                    : "Approving & creating…"
                  : req.status === "failed"
                    ? "Retry & create"
                    : "Approve & create"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy !== null}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md text-red-600 border border-red-200 dark:border-red-900/40"
              >
                Reject
              </button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection"
                className="flex-1 px-3 py-1.5 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <button
                onClick={() => reason.trim() && act("reject")}
                disabled={!reason.trim() || busy !== null}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-red-600 text-white disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={() => setRejecting(false)}
                className="px-3 py-1.5 text-[11px] rounded-md border border-neutral-300 dark:border-neutral-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {req.status === "approved" && req.created_container_id && (
        <p className="text-[11px] text-emerald-600 mt-2 m-0">
          Created {req.containers_created ?? 1} container(s) · root{" "}
          {req.created_container_id.slice(0, 100)}…
        </p>
      )}

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function QuestionnaireReview({ review }: { review: any }) {
  const questions = review.questions ?? [];
  const answers = review.answers ?? [];
  const answerFor = (qid: string) =>
    answers.find((a: any) => a.question_id === qid);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0 mb-1">
        Questionnaire answers
      </p>
      <div className="space-y-2">
        {questions.map((q: any) => {
          const a = answerFor(q.id);
          const val =
            a?.value_json ??
            a?.value_text ??
            (a?.document_id ? `Document ${a.document_id.slice(0, 8)}…` : "—");
          return (
            <div key={q.id} className="text-[11px]">
              <p className="text-neutral-500 dark:text-neutral-400 m-0">
                {q.prompt}
              </p>
              <p className="text-black dark:text-white m-0 font-medium">
                {Array.isArray(val) ? val.join(", ") : String(val)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReqStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_review: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    approved: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    rejected: "text-red-600 bg-red-50 dark:bg-red-950/30",
    failed: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
