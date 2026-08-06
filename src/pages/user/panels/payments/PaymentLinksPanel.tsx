import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { linksApi, money } from "./payments-api";

export default function PaymentLinksPanel({
  containerId,
}: {
  containerId: string;
}) {
  const qc = useQueryClient();

  // ── toolbar state (search/filter/sort) ──────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<
    "created_at" | "title" | "category" | "total_collected" | "payment_count"
  >("created_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const filters = useMemo(
    () => ({
      category: categoryFilter || undefined,
      search: search || undefined,
      sort,
      direction,
    }),
    [categoryFilter, search, sort, direction],
  );

  const linksQ = useQuery({
    queryKey: ["payment-links", containerId, filters],
    queryFn: () => linksApi.list(containerId, filters),
  });
  const links: any[] = Array.isArray(linksQ.data) ? linksQ.data : [];

  const categoriesQ = useQuery({
    queryKey: ["payment-link-categories", containerId],
    queryFn: () => linksApi.categories(containerId),
  });
  const categories: string[] = Array.isArray(categoriesQ.data)
    ? categoriesQ.data
    : [];

  // ── create form ───────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"reusable" | "single_use">("reusable");
  const [customSlug, setCustomSlug] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugCheck, setSlugCheck] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const payBase =
    (import.meta.env.VITE_PUBLIC_PAY_URL as string) ??
    `${window.location.origin}/pay`;

  // debounced slug availability check
  useEffect(() => {
    if (!customSlug || !slug.trim()) {
      setSlugCheck("idle");
      return;
    }
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(normalized)) {
      setSlugCheck("invalid");
      return;
    }
    setSlugCheck("checking");
    const id = setTimeout(async () => {
      try {
        const res: any = await linksApi.checkSlug(normalized);
        setSlugCheck(res.available ? "available" : "taken");
      } catch {
        setSlugCheck("idle");
      }
    }, 400);
    return () => clearTimeout(id);
  }, [slug, customSlug]);

  const create = useMutation({
    mutationFn: () =>
      linksApi.create({
        container_id: containerId,
        title: title.trim(),
        category: category.trim() || undefined,
        amount: open ? null : Math.round(parseFloat(amount || "0") * 100),
        mode,
        slug: customSlug && slug.trim() ? slug.trim().toLowerCase() : undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setCategory("");
      setAmount("");
      setSlug("");
      setCustomSlug(false);
      setSlugCheck("idle");
      qc.invalidateQueries({ queryKey: ["payment-links", containerId] });
      qc.invalidateQueries({
        queryKey: ["payment-link-categories", containerId],
      });
    },
  });

  const disable = useMutation({
    mutationFn: (id: string) => linksApi.disable(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payment-links", containerId] }),
  });

  const canSubmit =
    title.trim() &&
    (!open ? !!amount : true) &&
    !create.isPending &&
    (!customSlug || !slug.trim() || slugCheck === "available");

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* create */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <p className="text-sm font-semibold text-black dark:text-white m-0">
          New payment link
        </p>

        <div className="grid grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this for? (e.g. Invoice #204)"
            className={inputCls}
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Invoices)"
            list="payment-link-categories"
            className={inputCls}
          />
          <datalist id="payment-link-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-neutral-500">
            <input
              type="checkbox"
              checked={open}
              onChange={(e) => setOpen(e.target.checked)}
            />
            Let payer choose amount
          </label>
          {!open && (
            <input
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="Amount (TZS)"
              className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
          )}
        </div>

        {/* custom link */}
        <div>
          <label className="flex items-center gap-1 text-[11px] text-neutral-500 mb-1.5">
            <input
              type="checkbox"
              checked={customSlug}
              onChange={(e) => {
                setCustomSlug(e.target.checked);
                if (!e.target.checked) {
                  setSlug("");
                  setSlugCheck("idle");
                }
              }}
            />
            Use a custom link
          </label>
          {customSlug && (
            <div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-neutral-400 whitespace-nowrap">
                  {payBase}/
                </span>
                <input
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  placeholder="my-invoice"
                  className="flex-1 px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
                />
              </div>
              {slugCheck === "checking" && (
                <p className="text-[11px] text-neutral-400 m-0 mt-1">
                  Checking…
                </p>
              )}
              {slugCheck === "available" && (
                <p className="text-[11px] text-emerald-600 m-0 mt-1">
                  ✓ Available
                </p>
              )}
              {slugCheck === "taken" && (
                <p className="text-[11px] text-red-500 m-0 mt-1">
                  Already taken — try another.
                </p>
              )}
              {slugCheck === "invalid" && (
                <p className="text-[11px] text-red-500 m-0 mt-1">
                  3–40 characters: lowercase letters, numbers, hyphens only.
                </p>
              )}
            </div>
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
            disabled={!canSubmit}
            className="ml-auto px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {create.isPending ? "…" : "Create link"}
          </button>
        </div>
      </div>

      {/* toolbar: search / filter / sort */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="flex-1 min-w-[160px] px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="created_at">Newest</option>
          <option value="title">Title</option>
          <option value="category">Category</option>
          <option value="total_collected">Amount collected</option>
          <option value="payment_count">Payments</option>
        </select>
        <button
          onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
          className="px-2 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
          title="Toggle sort direction"
        >
          {direction === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* list */}
      <div className="space-y-2">
        {linksQ.isLoading ? (
          <p className="text-[11px] text-neutral-400">Loading…</p>
        ) : links.length === 0 ? (
          <p className="text-[11px] text-neutral-400">
            No payment links match.
          </p>
        ) : (
          links.map((l) => {
            const url = `${payBase}/${l.slug}`;
            const isExpanded = expandedId === l.id;
            return (
              <div
                key={l.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-black dark:text-white m-0">
                        {l.title}
                      </p>
                      {l.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {l.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      {l.amount ? money(l.amount, l.currency) : "Open amount"} ·{" "}
                      {l.mode} ·{" "}
                      <span
                        className={
                          l.status === "active"
                            ? "text-emerald-600"
                            : "text-neutral-400"
                        }
                      >
                        {l.status}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      {l.payment_count} paid ·{" "}
                      {money(l.total_collected, l.currency)} collected
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

                <button
                  onClick={() => setExpandedId(isExpanded ? null : l.id)}
                  className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-600 underline"
                >
                  {isExpanded ? "hide payments" : "view payments"}
                </button>

                {isExpanded && (
                  <ChargesTable linkId={l.id} currency={l.currency} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChargesTable({
  linkId,
  currency,
}: {
  linkId: string;
  currency: string;
}) {
  const chargesQ = useQuery({
    queryKey: ["payment-link-charges", linkId],
    queryFn: () => linksApi.charges(linkId),
  });
  const charges: any[] = Array.isArray(chargesQ.data) ? chargesQ.data : [];

  const statusStyle = (status: string) =>
    status === "paid"
      ? "text-emerald-600"
      : status === "failed"
        ? "text-red-500"
        : "text-neutral-400";

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      {chargesQ.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading payments…</p>
      ) : charges.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                <th className="font-medium py-1.5 pr-3">Payer</th>
                <th className="font-medium py-1.5 pr-3">Phone</th>
                <th className="font-medium py-1.5 pr-3">Amount</th>
                <th className="font-medium py-1.5 pr-3">Status</th>
                <th className="font-medium py-1.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-50 dark:border-neutral-900 last:border-0"
                >
                  <td className="py-1.5 pr-3 text-black dark:text-white">
                    {c.payer_name || "—"}
                    {c.payer_email && (
                      <span className="block text-neutral-400">
                        {c.payer_email}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-600 dark:text-neutral-300">
                    {c.payer_phone || "—"}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums text-neutral-600 dark:text-neutral-300">
                    {money(c.amount, c.currency ?? currency)}
                  </td>
                  <td
                    className={`py-1.5 pr-3 font-medium ${statusStyle(c.status)}`}
                  >
                    {c.status}
                  </td>
                  <td className="py-1.5 text-neutral-400">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
