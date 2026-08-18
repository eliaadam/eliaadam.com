import { useQuery } from "@tanstack/react-query";

/*
 * MyInstantiationRequests — the user's own instantiation requests and their
 * status. Shown in CreateSection so a user who submitted a request (for a
 * judgment-gated template) can see it's pending, approved, or rejected — and,
 * once approved, that their organization was created.
 *
 * Reads GET /hierarchy/instantiation-requests/mine.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

export default function MyInstantiationRequests() {
  const q = useQuery({
    queryKey: ["my-inst-requests"],
    queryFn: () => api("GET", "hierarchy/instantiation-requests/mine"),
    refetchInterval: 30000, // poll so an approval shows up without a manual refresh
  });

  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  if (q.isLoading || rows.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Your requests
      </h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <RequestRow key={r.id} req={r} />
        ))}
      </div>
    </div>
  );
}

function RequestRow({ req }: { req: any }) {
  const params = req.parameters ?? {};
  const name =
    params.display_name_prefix || params.code_prefix || "Organization";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-black dark:text-white m-0">
          {name}
        </p>
        <p className="text-[11px] text-neutral-400 m-0">
          {req.target_type === "template" ? "Organization" : "Container"} ·
          requested {new Date(req.created_at).toLocaleDateString()}
        </p>
        {req.status === "rejected" && req.review_note && (
          <p className="text-[11px] text-red-600 m-0 mt-1">
            Reason: {req.review_note}
          </p>
        )}
        {req.status === "approved" && req.created_container_id && (
          <p className="text-[11px] text-emerald-600 m-0 mt-1">
            Created {req.containers_created ?? 1} container(s).
          </p>
        )}
        {req.status === "failed" && (
          <p className="text-[11px] text-red-600 m-0 mt-1">
            {req.review_note ?? "Creation failed — an administrator can retry."}
          </p>
        )}
      </div>
      <StatusPill status={req.status} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_review: {
      label: "Pending review",
      cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    },
    approved: {
      label: "Approved",
      cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    },
    rejected: {
      label: "Rejected",
      cls: "text-red-600 bg-red-50 dark:bg-red-950/30",
    },
    failed: {
      label: "Failed",
      cls: "text-red-600 bg-red-50 dark:bg-red-950/30",
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: "text-neutral-500 bg-neutral-100 dark:bg-neutral-900",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
