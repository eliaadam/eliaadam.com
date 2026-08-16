import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  procurementApi as api,
  scopeBase,
  toMajor,
  fmtDate,
  type OwnerScope,
} from "./procurement-api";

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

type OpenTendersPanelProps = {
  containerId: string;
  permissions: string[];
};

export default function OpenTendersPanel({
  permissions,
}: OpenTendersPanelProps) {
  const [bidding, setBidding] = useState<Tender | null>(null);

  /*
   * IMPORTANT:
   *
   * Open Tenders is an actor-scoped operation.
   *
   * The containerId here belongs to the workspace the user is currently
   * viewing. It must NOT be used as the tenderer identity.
   *
   * The backend actor-scoped endpoints are:
   *
   * GET  /procurement/tenders/open
   * POST /procurement/tenders/{tenderId}/bid
   * GET  /procurement/tenders/{tenderId}/bid
   * DELETE /procurement/tenders/{tenderId}/bid
   */
  const scope: OwnerScope = {
    type: "actor",
  };
  const canBid = permissions.includes("system.procurement.bid.submit");
  const tenders = useQuery({
    queryKey: ["procurement", "open", "actor"],
    queryFn: () => api("GET", `${scopeBase(scope)}/tenders/open`),
  });

  const list: Tender[] = Array.isArray(tenders.data) ? tenders.data : [];

  if (!canBid) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have permission to submit bids here.
      </div>
    );
  }

  if (bidding) {
    return (
      <BidForm
        scope={scope}
        tender={bidding}
        onClose={() => setBidding(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-black dark:text-white">
          Open Tenders
        </h2>

        <p className="text-[11px] text-neutral-500 mt-0.5">
          Browse published tenders and submit sealed bids as yourself.
        </p>
      </div>

      {tenders.isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : tenders.isError ? (
        <div className="text-sm text-red-600">Failed to load open tenders.</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No open tenders right now.
        </div>
      ) : (
        list.map((tender) => (
          <TenderCard
            key={tender.id}
            tender={tender}
            onBid={() => setBidding(tender)}
          />
        ))
      )}
    </div>
  );
}

function TenderCard({ tender, onBid }: { tender: Tender; onBid: () => void }) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-black dark:text-white flex items-center gap-2">
            {tender.title}

            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              {tender.category}
            </span>
          </div>

          <div className="text-[11px] text-neutral-400">{tender.reference}</div>

          {tender.description && (
            <div className="text-[11px] text-neutral-400 mt-1">
              {tender.description}
            </div>
          )}

          <div className="text-[11px] text-neutral-400 mt-1">
            Closes {fmtDate(tender.closes_at)}
            {" · "}
            Opens {fmtDate(tender.opens_at)}
            {tender.estimated_value !== null
              ? ` · est. ${toMajor(tender.estimated_value)} ${tender.currency}`
              : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onBid}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          Bid
        </button>
      </div>
    </div>
  );
}

function BidForm({
  scope,
  tender,
  onClose,
}: {
  scope: OwnerScope;
  tender: Tender;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  /*
   * Because scope.type === "actor", these resolve to:
   *
   * GET    /procurement/tenders/{id}/bid
   * POST   /procurement/tenders/{id}/bid
   * DELETE /procurement/tenders/{id}/bid
   */
  const bidPath = `${scopeBase(scope)}/tenders/${tender.id}/bid`;

  const existing = useQuery({
    queryKey: ["procurement", "mybid", "actor", tender.id],
    queryFn: () => api<Bid | null>("GET", bidPath),
  });

  const bid: Bid | null = existing.data ?? null;

  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api("POST", bidPath, {
        price: Math.round(parseFloat(price || "0") * 100),
        currency: tender.currency,
        response: notes
          ? {
              notes,
            }
          : {},
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["procurement", "mybid", "actor", tender.id],
      });
    },
  });

  const withdraw = useMutation({
    mutationFn: () => api("DELETE", bidPath),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["procurement", "mybid", "actor", tender.id],
      });
    },
  });

  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-3 max-w-xl">
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← Back
      </button>

      <div className="text-lg font-semibold text-black dark:text-white">
        Bid — {tender.title}
      </div>

      <div className="text-[11px] text-amber-600">
        You are bidding as yourself. This bid is not submitted on behalf of an
        organization.
      </div>

      <div className="text-[11px] text-neutral-400">
        Your bid is sealed. The procuring entity cannot see its contents until
        the opening time ({fmtDate(tender.opens_at)}).
      </div>

      {existing.isLoading ? (
        <div className="text-xs text-neutral-500">
          Checking your existing bid…
        </div>
      ) : bid && bid.status !== "withdrawn" ? (
        <div className="text-xs px-3 py-2 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          You have a {bid.status} bid
          {bid.price !== null
            ? ` of ${toMajor(bid.price)} ${bid.currency}`
            : ""}{" "}
          submitted {fmtDate(bid.submitted_at)}. Submitting again replaces it.
        </div>
      ) : null}

      <div>
        <label className="text-[11px] text-neutral-500">
          Your price ({tender.currency})
        </label>

        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          type="number"
          min="0"
          step="0.01"
          className={`${input} w-full`}
        />
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes / offer details (optional)"
        rows={3}
        className={`${input} w-full`}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit.mutate()}
          disabled={!price || Number.parseFloat(price) < 0 || submit.isPending}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {submit.isPending
            ? "Submitting…"
            : bid && bid.status !== "withdrawn"
              ? "Replace bid"
              : "Submit sealed bid"}
        </button>

        {bid && bid.status !== "withdrawn" && (
          <button
            type="button"
            onClick={() => withdraw.mutate()}
            disabled={withdraw.isPending}
            className="px-4 py-2 text-sm rounded-md border border-red-300 text-red-600 disabled:opacity-40"
          >
            {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
          </button>
        )}
      </div>

      {submit.isError && (
        <div className="text-xs text-red-600">
          {(submit.error as Error)?.message}
        </div>
      )}

      {withdraw.isError && (
        <div className="text-xs text-red-600">
          {(withdraw.error as Error)?.message}
        </div>
      )}
    </div>
  );
}
