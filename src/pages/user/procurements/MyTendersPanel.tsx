import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi as api, toMajor, fmtDate } from "./procurement-api";

type Tender = {
  id: string;
  reference: string;
  title: string;
  category: string;
  status: string;
  closes_at: string | null;
  opens_at: string | null;
  currency: string;
  awarded_bid_id: string | null;
  evaluation_method: string;
};
type Bid = {
  id: string;
  tenderer_container_id: string | null;
  tenderer_actor_id: string | null;
  submitted_at: string | null;
  status: string;
  sealed: boolean;
  price?: number | null;
  currency?: string;
  score?: number | null;
  rank?: number;
};

const CATEGORIES = [
  "Goods",
  "Works",
  "Consultancy",
  "NonConsultancy",
  "Disposal",
];

/** Procuring-entity side — the full tender lifecycle. */
export default function MyTendersPanel({
  containerId,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const tenders = useQuery({
    queryKey: ["procurement", "mine", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/tenders`),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api("POST", `/containers/${containerId}/tenders/${id}/${action}`),
    onSuccess: (_d, v) => {
      setMsg(`Tender ${v.action === "open" ? "opened" : v.action + "ed"}.`);
      qc.invalidateQueries({ queryKey: ["procurement", "mine", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  if (viewing)
    return (
      <TenderDetail
        containerId={containerId}
        tenderId={viewing}
        onClose={() => setViewing(null)}
        onChanged={() =>
          qc.invalidateQueries({
            queryKey: ["procurement", "mine", containerId],
          })
        }
      />
    );
  if (creating)
    return (
      <CreateTenderForm
        containerId={containerId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          qc.invalidateQueries({
            queryKey: ["procurement", "mine", containerId],
          });
        }}
      />
    );

  const list: Tender[] = Array.isArray(tenders.data) ? tenders.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}
      <button
        onClick={() => setCreating(true)}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
      >
        + New tender
      </button>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {tenders.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No tenders yet.
          </div>
        ) : (
          list.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <button onClick={() => setViewing(t.id)} className="text-left">
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {t.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {t.category}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {t.reference} · closes {fmtDate(t.closes_at)} · opens{" "}
                  {fmtDate(t.opens_at)}
                </div>
              </button>
              <div className="flex gap-1">
                {t.status === "draft" && (
                  <button
                    onClick={() => act.mutate({ id: t.id, action: "publish" })}
                    className="px-2 py-1 text-[11px] rounded border border-green-400 text-green-700 dark:text-green-400"
                  >
                    Publish
                  </button>
                )}
                {["published", "closed"].includes(t.status) && (
                  <button
                    onClick={() => act.mutate({ id: t.id, action: "open" })}
                    className="px-2 py-1 text-[11px] rounded border border-blue-400 text-blue-700 dark:text-blue-400"
                  >
                    Open bids
                  </button>
                )}
                <button
                  onClick={() => setViewing(t.id)}
                  className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                >
                  Manage
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published:
      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    opened: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    evaluated:
      "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    awarded:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full ${map[status] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
    >
      {status}
    </span>
  );
}

function TenderDetail({
  containerId,
  tenderId,
  onClose,
  onChanged,
}: {
  containerId: string;
  tenderId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const tender = useQuery({
    queryKey: ["procurement", "tender", containerId, tenderId],
    queryFn: () => api("GET", `/containers/${containerId}/tenders/${tenderId}`),
  });
  const bids = useQuery({
    queryKey: ["procurement", "bids", containerId, tenderId],
    queryFn: () =>
      api("GET", `/containers/${containerId}/tenders/${tenderId}/bids`),
  });
  // Evaluation records come from the client apps (Flutter/React); the server
  // stores them. Quick-preview list = summary + ranking only.
  const records = useQuery({
    queryKey: ["procurement", "eval-records", containerId, tenderId],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/tenders/${tenderId}/evaluation/records`,
      ),
  });

  const refresh = () => {
    qc.invalidateQueries({
      queryKey: ["procurement", "tender", containerId, tenderId],
    });
    qc.invalidateQueries({
      queryKey: ["procurement", "bids", containerId, tenderId],
    });
    qc.invalidateQueries({
      queryKey: ["procurement", "eval-records", containerId, tenderId],
    });
    onChanged();
  };

  const applyRecord = useMutation({
    mutationFn: (recordId: string) =>
      api(
        "POST",
        `/containers/${containerId}/tenders/${tenderId}/evaluation/records/${recordId}/apply`,
      ),
    onSuccess: () => {
      setMsg("Evaluation applied — bids ranked.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const award = useMutation({
    mutationFn: (bidId: string) =>
      api("POST", `/containers/${containerId}/tenders/${tenderId}/award`, {
        bid_id: bidId,
      }),
    onSuccess: () => {
      setMsg("Awarded — contract created.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const t: Tender | undefined = tender.data as Tender | undefined;
  const bidList: Bid[] = Array.isArray(bids.data) ? bids.data : [];
  if (!t) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div>
        <div className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
          {t.title} <StatusBadge status={t.status} />
        </div>
        <div className="text-[11px] text-neutral-400">
          {t.reference} · closes {fmtDate(t.closes_at)} · opens{" "}
          {fmtDate(t.opens_at)}
        </div>
      </div>
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      <div>
        <div className="text-sm font-medium text-black dark:text-white mb-2">
          Bids ({bidList.length})
        </div>
        {bidList.length === 0 ? (
          <div className="text-sm text-neutral-500">No bids yet.</div>
        ) : (
          <div className="space-y-2">
            {bidList.map((b) => (
              <div
                key={b.id}
                className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    {b.tenderer_container_id
                      ? `Tenderer ${b.tenderer_container_id.slice(0, 8)}`
                      : `Individual bidder ${b.tenderer_actor_id?.slice(0, 8) ?? ""}`}
                    {b.rank != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700">
                        rank {b.rank}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    {b.tenderer_container_id
                      ? `Tenderer ${b.tenderer_container_id.slice(0, 8)}`
                      : `Individual bidder ${b.tenderer_actor_id?.slice(0, 8) ?? ""}`}
                    {b.rank != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700">
                        rank {b.rank}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {b.sealed ? (
                      <span className="text-neutral-400">
                        🔒 Sealed until opening
                      </span>
                    ) : (
                      <>
                        Price{" "}
                        {b.price != null
                          ? `${toMajor(b.price)} ${b.currency}`
                          : "—"}
                        {b.score != null ? ` · score ${b.score}` : ""} ·{" "}
                        {fmtDate(b.submitted_at)}
                      </>
                    )}
                  </div>
                </div>
                {!b.sealed && t.status === "evaluated" && (
                  <button
                    onClick={() => award.mutate(b.id)}
                    className="px-2 py-1 text-[11px] rounded bg-amber-500 text-white"
                  >
                    Award
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation records — computed in the Flutter/React apps, stored here. */}
      {["opened", "evaluated", "awarded"].includes(t.status) && (
        <div>
          <div className="text-sm font-medium text-black dark:text-white mb-2">
            Evaluations
          </div>
          <div className="text-[11px] text-neutral-400 mb-2">
            Evaluations are prepared in the evaluation apps and submitted here.
            Applying one ranks the bids for award.
          </div>
          <EvaluationRecords
            records={records.data}
            onApply={(id) => applyRecord.mutate(id)}
            applying={applyRecord.isPending}
          />
        </div>
      )}
    </div>
  );
}

function EvaluationRecords({
  records,
  onApply,
  applying,
}: {
  records: any;
  onApply: (id: string) => void;
  applying: boolean;
}) {
  const list: any[] = Array.isArray(records) ? records : [];
  if (list.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        No evaluations submitted yet.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {list.map((rec) => (
        <div
          key={rec.id}
          className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-black dark:text-white flex items-center gap-2">
                {rec.title || rec.kind || "Evaluation"}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                  {rec.kind}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${rec.status === "applied" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
                >
                  {rec.status}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {rec.source_app ? `from ${rec.source_app} · ` : ""}
                {fmtDate(rec.computed_at)}
                {Array.isArray(rec.ranking)
                  ? ` · ${rec.ranking.length} ranked`
                  : ""}
              </div>
            </div>
            {rec.status !== "applied" &&
              Array.isArray(rec.ranking) &&
              rec.ranking.length > 0 && (
                <button
                  onClick={() => onApply(rec.id)}
                  disabled={applying}
                  className="px-2 py-1 text-[11px] rounded bg-purple-600 text-white disabled:opacity-40"
                >
                  Apply
                </button>
              )}
          </div>
          {rec.summary && (
            <pre className="mt-2 text-[10px] bg-neutral-50 dark:bg-neutral-900 rounded p-2 overflow-auto text-neutral-600 dark:text-neutral-400 max-h-32">
              {JSON.stringify(rec.summary, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateTenderForm({
  containerId,
  onClose,
  onCreated,
}: {
  containerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Goods");
  const [closesAt, setClosesAt] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [estValue, setEstValue] = useState("");
  // Evaluation-method hint for the client evaluation apps (server doesn't compute
  // with it). "" lets the server pick a default by category.
  const [method, setMethod] = useState("");
  const METHOD_HINTS = [
    { code: "", label: "Default for category" },
    { code: "lowest_price", label: "Lowest evaluated price" },
    { code: "weighted_score", label: "Weighted technical + financial" },
    { code: "boq_comparison", label: "BOQ comparison" },
  ];

  const create = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/tenders`, {
        title: title.trim(),
        description: description.trim() || null,
        category,
        closes_at: closesAt || null,
        opens_at: opensAt || null,
        evaluation_method: method || undefined,
        estimated_value: estValue
          ? Math.round(parseFloat(estValue) * 100)
          : null,
      }),
    onSuccess: onCreated,
  });

  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-3 max-w-xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div className="text-lg font-semibold text-black dark:text-white">
        New tender
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={`${input} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className={`${input} w-full`}
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setMethod("");
          }}
          className={input}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={estValue}
          onChange={(e) => setEstValue(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Est. value"
          className={`${input} w-40`}
        />
      </div>
      <div>
        <label className="text-[11px] text-neutral-500">
          Evaluation method (hint for evaluators)
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={`${input} w-full`}
        >
          {METHOD_HINTS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-neutral-500">
            Submission deadline
          </label>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={`${input} w-full`}
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-neutral-500">
            Bid opening time
          </label>
          <input
            type="datetime-local"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            className={`${input} w-full`}
          />
        </div>
      </div>
      <button
        onClick={() => create.mutate()}
        disabled={!title.trim() || create.isPending}
        className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {create.isPending ? "Creating…" : "Create tender"}
      </button>
      {create.isError && (
        <div className="text-xs text-red-600">
          {(create.error as any)?.message}
        </div>
      )}
    </div>
  );
}
