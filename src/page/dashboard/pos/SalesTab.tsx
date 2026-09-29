import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { PaymentMethod } from "../../../lib/sdk/domains/pos";
import { badgeClass, cardClass, errorMessage, errorTextClass, formatDateTime, formatMoney, paymentMethodLabel, selectClass } from "./ui";

export function SalesTab({ containerId }: { containerId: string }) {
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ["pos", "sales", containerId, method],
    queryFn: () => sdk.pos.listSales(containerId, { payment_method: method || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Payment method</label>
        <select className={`${selectClass} w-48`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}>
          <option value="">All</option>
          <option value="cash">Cash</option>
          <option value="direct">Card / mobile money</option>
          <option value="credit">On credit</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load sales.")}</p>}

      {sales && (
        <ul className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {sales.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="w-36 flex-none text-xs text-neutral-500 dark:text-neutral-500">{formatDateTime(s.created_at)}</span>
                <span className="min-w-0 flex-1 truncate">{s.lines.map((l) => `${l.title} ×${l.quantity}`).join(", ")}</span>
                <span className="flex-none font-medium">{formatMoney(s.total, s.currency)}</span>
                <span className={badgeClass}>{paymentMethodLabel(s.payment_method)}</span>
              </button>
              {selectedId === s.id && (
                <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                  <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
                    {s.lines.map((l) => (
                      <li key={l.item_id} className="flex items-center justify-between py-1">
                        <span>{l.title} × {l.quantity} @ {formatMoney(l.unit_price, s.currency)}</span>
                        <span>{formatMoney(l.line_total, s.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  {s.payment_method === "cash" && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                      Tendered {formatMoney(s.amount_tendered ?? 0, s.currency)}, change {formatMoney(s.change_given ?? 0, s.currency)}
                    </p>
                  )}
                  {s.payment_method === "direct" && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">Reference: {s.payment_reference}</p>}
                </div>
              )}
            </li>
          ))}
          {sales.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No sales yet.</li>}
        </ul>
      )}
    </div>
  );
}
