import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { linksApi, money } from "./payments-api";

/**
 * Merchant view: create shareable payment links and see what's been collected.
 * The public pay page lives at /pay/{slug} (see PayLinkPage).
 */
export default function PaymentLinksPanel({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const linksQ = useQuery({
    queryKey: ["payment-links", containerId],
    queryFn: () => linksApi.list(containerId),
  });
  const links: any[] = Array.isArray(linksQ.data) ? linksQ.data : [];

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false); // open amount = payer chooses
  const [mode, setMode] = useState<"reusable" | "single_use">("reusable");

  const create = useMutation({
    mutationFn: () =>
      linksApi.create({
        container_id: containerId,
        title: title.trim(),
        amount: open ? null : Math.round(parseFloat(amount || "0") * 100),
        mode,
      }),
    onSuccess: () => {
      setTitle("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["payment-links", containerId] });
    },
  });

  const disable = useMutation({
    mutationFn: (id: string) => linksApi.disable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-links", containerId] }),
  });

  const payBase =
    (import.meta.env.VITE_PUBLIC_PAY_URL as string) ?? `${window.location.origin}/pay`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* create */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <p className="text-sm font-semibold text-black dark:text-white m-0">New payment link</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's this for? (e.g. Invoice #204)"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-neutral-500">
            <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
            Let payer choose amount
          </label>
          {!open && (
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Amount (TZS)"
              className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
          )}
        </div>
        <div className="flex gap-2">
          {(["reusable", "single_use"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md border ${
                mode === m
                  ? "bg-black text-white dark:bg-white dark:text-black border-black"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
              }`}
            >
              {m === "reusable" ? "Reusable" : "Single use"}
            </button>
          ))}
          <button
            onClick={() => create.mutate()}
            disabled={!title.trim() || (!open && !amount) || create.isPending}
            className="ml-auto px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {create.isPending ? "…" : "Create link"}
          </button>
        </div>
      </div>

      {/* list */}
      <div className="space-y-2">
        {linksQ.isLoading ? (
          <p className="text-[11px] text-neutral-400">Loading…</p>
        ) : links.length === 0 ? (
          <p className="text-[11px] text-neutral-400">No payment links yet.</p>
        ) : (
          links.map((l) => {
            const url = `${payBase}/${l.slug}`;
            return (
              <div
                key={l.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white m-0">{l.title}</p>
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      {l.amount ? money(l.amount, l.currency) : "Open amount"} · {l.mode} ·{" "}
                      <span
                        className={
                          l.status === "active" ? "text-emerald-600" : "text-neutral-400"
                        }
                      >
                        {l.status}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      {l.payment_count} paid · {money(l.total_collected, l.currency)} collected
                    </p>
                  </div>
                  {l.status === "active" && (
                    <button
                      onClick={() => disable.mutate(l.id)}
                      className="text-[11px] text-neutral-400 hover:text-red-500 underline"
                    >
                      disable
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    className="flex-1 px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                  />
                  <button
                    onClick={() => navigator.clipboard?.writeText(url)}
                    className="px-3 py-1 text-[11px] font-semibold rounded border border-neutral-300 dark:border-neutral-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
