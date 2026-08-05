import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi as api, toMajor, fmtDate } from "./procurement-api";

type Tender = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  category: string;
  closes_at: string | null;
  opens_at: string | null;
  estimated_value: number | null;
  currency: string;
};
type Bid = {
  id: string;
  price: number | null;
  currency: string;
  status: string;
  submitted_at: string | null;
};

/** Tenderer side — browse published tenders and submit a sealed bid. */
export default function OpenTendersPanel({
  containerId,
}: {
  containerId: string;
  permissions: string[];
}) {
  const [bidding, setBidding] = useState<Tender | null>(null);

  const tenders = useQuery({
    queryKey: ["procurement", "open", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/tenders/open`),
  });
  const list: Tender[] = Array.isArray(tenders.data) ? tenders.data : [];

  if (bidding) {
    return (
      <BidForm
        containerId={containerId}
        tender={bidding}
        onClose={() => setBidding(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      {tenders.isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No open tenders right now.
        </div>
      ) : (
        list.map((t) => (
          <div
            key={t.id}
            className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-black dark:text-white flex items-center gap-2">
                  {t.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {t.category}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {t.reference}
                </div>
                {t.description && (
                  <div className="text-[11px] text-neutral-400 mt-1">
                    {t.description}
                  </div>
                )}
                <div className="text-[11px] text-neutral-400 mt-1">
                  Closes {fmtDate(t.closes_at)} · Opens {fmtDate(t.opens_at)}
                  {t.estimated_value
                    ? ` · est. ${toMajor(t.estimated_value)} ${t.currency}`
                    : ""}
                </div>
              </div>
              <button
                onClick={() => setBidding(t)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                Bid
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BidForm({
  containerId,
  tender,
  onClose,
}: {
  containerId: string;
  tender: Tender;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const existing = useQuery({
    queryKey: ["procurement", "mybid", containerId, tender.id],
    queryFn: () =>
      api("GET", `/containers/${containerId}/tenders/${tender.id}/bid`),
  });
  const bid: Bid | null = existing.data ?? null;

  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/tenders/${tender.id}/bid`, {
        price: Math.round(parseFloat(price || "0") * 100),
        currency: tender.currency,
        response: notes ? { notes } : {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["procurement", "mybid", containerId, tender.id],
      });
    },
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api("DELETE", `/containers/${containerId}/tenders/${tender.id}/bid`),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["procurement", "mybid", containerId, tender.id],
      }),
  });

  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-3 max-w-xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div className="text-lg font-semibold text-black dark:text-white">
        Bid — {tender.title}
      </div>
      <div className="text-[11px] text-neutral-400">
        Your bid is sealed: the procuring entity cannot see its contents until
        the opening time ({fmtDate(tender.opens_at)}).
      </div>

      {bid && bid.status !== "withdrawn" && (
        <div className="text-xs px-3 py-2 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          You have a {bid.status} bid
          {bid.price !== null
            ? ` of ${toMajor(bid.price)} ${bid.currency}`
            : ""}{" "}
          submitted {fmtDate(bid.submitted_at)}. Submitting again replaces it.
        </div>
      )}

      <div>
        <label className="text-[11px] text-neutral-500">
          Your price ({tender.currency})
        </label>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          className={`${input} w-full`}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes / offer details (optional)"
        rows={3}
        className={`${input} w-full`}
      />

      <div className="flex gap-2">
        <button
          onClick={() => submit.mutate()}
          disabled={!price || submit.isPending}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {submit.isPending
            ? "Submitting…"
            : bid
              ? "Replace bid"
              : "Submit sealed bid"}
        </button>
        {bid && bid.status !== "withdrawn" && (
          <button
            onClick={() => withdraw.mutate()}
            className="px-4 py-2 text-sm rounded-md border border-red-300 text-red-600"
          >
            Withdraw
          </button>
        )}
      </div>
      {submit.isError && (
        <div className="text-xs text-red-600">
          {(submit.error as any)?.message}
        </div>
      )}
    </div>
  );
}
