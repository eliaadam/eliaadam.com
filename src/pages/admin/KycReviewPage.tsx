import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/*
 * Admin → KYC Review. PLATFORM-WIDE, system-admin.
 *
 * The review side of KYC belongs here, not in a tenant workspace: an admin
 * reviews submissions across ALL containers, so they need one console queue, not
 * to visit each container. The backend endpoints are already platform-wide
 * (they take no container). Reviewing shows the FULL submitted record plus the
 * uploaded documents (download links) — you can't approve what you can't see.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function kyc(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/kyc${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

type KycRecord = {
  id: string;
  actor_id: string;
  status: string;
  legal_name?: string;
  nida_id?: string;
  tin_number?: string;
  brela_number?: string;
  business_license?: string;
  document_ids?: string[];
  metadata?: Record<string, any>;
  created_at: string;
};

export function KycReviewPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const q = useQuery({
    queryKey: ["admin", "kyc-queue"],
    queryFn: () => kyc("GET", "/review/queue"),
  });

  const act = async (id: string, action: "start-review" | "approve" | "reject", reason?: string) => {
    setBusy(id + action);
    setMsg(null);
    try {
      await kyc("POST", `/records/${id}/${action}`, reason ? { reason } : undefined);
      qc.invalidateQueries({ queryKey: ["admin", "kyc-queue"] });
      setMsg(`Record ${action === "start-review" ? "moved to review" : action + "d"}.`);
      setRejectFor(null);
      setRejectReason("");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  const rows: KycRecord[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">KYC Review</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Submissions awaiting verification across all containers. Review the details and documents before approving.
      </p>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">Nothing awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-black dark:text-white m-0">{r.legal_name ?? "—"}</p>
                  <p className="text-[11px] text-neutral-400 m-0">
                    {r.metadata?.subject_type ? `${r.metadata.subject_type} · ` : ""}
                    submitted {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <KycStatus status={r.status} />
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
                  >
                    {expanded === r.id ? "hide" : "review"}
                  </button>
                </div>
              </div>

              {expanded === r.id && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                    <Detail label="NIDA" value={r.nida_id} />
                    <Detail label="TIN" value={r.tin_number} />
                    <Detail label="BRELA" value={r.brela_number} />
                    <Detail label="Business licence" value={r.business_license} />
                    <Detail label="Date of birth" value={r.metadata?.dob} />
                    <Detail label="Nationality" value={r.metadata?.nationality} />
                    <Detail label="Address" value={r.metadata?.address} />
                    <Detail label="City" value={r.metadata?.city} />
                  </div>

                  <DocumentsList documentIds={r.document_ids ?? []} />
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {r.status === "submitted" && (
                  <button onClick={() => act(r.id, "start-review")} disabled={busy !== null}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                    Start review
                  </button>
                )}
                {(r.status === "under_review" || r.status === "submitted") && (
                  <>
                    <button onClick={() => act(r.id, "approve")} disabled={busy !== null}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-40">
                      {busy === r.id + "approve" ? "Approving…" : "Approve"}
                    </button>
                    <button onClick={() => setRejectFor(rejectFor === r.id ? null : r.id)} disabled={busy !== null}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-md text-red-600 border border-red-200 dark:border-red-900/40 disabled:opacity-40">
                      Reject
                    </button>
                  </>
                )}
              </div>

              {rejectFor === r.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection"
                    className="flex-1 px-3 py-1.5 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                  />
                  <button
                    onClick={() => rejectReason.trim() && act(r.id, "reject", rejectReason.trim())}
                    disabled={!rejectReason.trim() || busy !== null}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-red-600 text-white disabled:opacity-40"
                  >
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {msg && <p className="text-[11px] text-neutral-500 mt-3">{msg}</p>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0">{label}</p>
      <p className="text-sm text-black dark:text-white m-0">{value || <span className="text-neutral-400">—</span>}</p>
    </div>
  );
}

/* documents attached to the record — download links via the Documents API */
function DocumentsList({ documentIds }: { documentIds: string[] }) {
  if (documentIds.length === 0) {
    return <p className="text-[11px] text-neutral-400 m-0">No documents attached.</p>;
  }
  const downloadUrl = (id: string) => `${API}/api/documents/${id}/download`;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0 mb-1">Documents</p>
      <div className="flex flex-wrap gap-2">
        {documentIds.map((id) => (
          <a
            key={id}
            href={downloadUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            ⇩ Document {id.slice(0, 8)}
          </a>
        ))}
      </div>
      <p className="text-[10px] text-neutral-400 mt-1 m-0">
        Downloads open with your admin session; viewing requires documents.document.view on the container.
      </p>
    </div>
  );
}

function KycStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    under_review: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    approved: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    rejected: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
