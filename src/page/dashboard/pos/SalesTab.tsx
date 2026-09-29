import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { PaymentMethod, Sale } from "../../../lib/sdk/domains/pos";
import { badgeClass, cardClass, dangerButtonClass, errorMessage, errorTextClass, formatDateTime, formatMoney, inputClass, paymentMethodLabel, secondaryButtonClass, selectClass } from "./ui";

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
                <span className={`min-w-0 flex-1 truncate ${s.void ? "text-neutral-400 line-through dark:text-neutral-600" : ""}`}>
                  {s.lines.map((l) => `${l.title} ×${l.quantity}`).join(", ")}
                </span>
                <span className="flex-none font-medium">{formatMoney(s.total, s.currency)}</span>
                <span className={badgeClass}>{paymentMethodLabel(s.payment_method)}</span>
                {s.void && <span className={`${badgeClass} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400`}>Voided</span>}
              </button>
              {selectedId === s.id && <SaleDetail containerId={containerId} sale={s} />}
            </li>
          ))}
          {sales.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No sales yet.</li>}
        </ul>
      )}
    </div>
  );
}

function SaleDetail({ containerId, sale }: { containerId: string; sale: Sale }) {
  const queryClient = useQueryClient();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");

  const voidSale = useMutation({
    mutationFn: () => sdk.pos.voidSale(containerId, sale.id, reason.trim()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pos", "sales", containerId] }); setVoiding(false); setReason(""); },
  });

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
        {sale.lines.map((l) => (
          <li key={l.item_id} className="flex items-center justify-between py-1">
            <span>{l.title} × {l.quantity} @ {formatMoney(l.unit_price, sale.currency)}</span>
            <span>{formatMoney(l.line_total, sale.currency)}</span>
          </li>
        ))}
      </ul>
      {sale.payment_method === "cash" && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          Tendered {formatMoney(sale.amount_tendered ?? 0, sale.currency)}, change {formatMoney(sale.change_given ?? 0, sale.currency)}
        </p>
      )}
      {sale.payment_method === "direct" && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">Reference: {sale.payment_reference}</p>}

      {sale.void ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
          Voided {formatDateTime(sale.void.voided_at)} — {sale.void.reason}
        </p>
      ) : voiding ? (
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputClass} max-w-xs`} placeholder="Reason for voiding this sale" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" onClick={() => voidSale.mutate()} disabled={!reason.trim() || voidSale.isPending} className={dangerButtonClass}>
            {voidSale.isPending ? "Voiding…" : "Confirm void"}
          </button>
          <button type="button" onClick={() => setVoiding(false)} className={secondaryButtonClass}>Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setVoiding(true)} className={`mt-2 ${secondaryButtonClass}`}>Void this sale</button>
      )}
      {voidSale.isError && <p className={`mt-1 ${errorTextClass}`}>{errorMessage(voidSale.error, "Couldn't void this sale.")}</p>}
    </div>
  );
}
