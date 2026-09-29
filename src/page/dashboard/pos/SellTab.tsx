import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { InventoryItem } from "../../../lib/sdk/domains/inventory";
import type { Customer } from "../../../lib/sdk/domains/customerCredit";
import type { PaymentMethod, Sale, SaleLineInput } from "../../../lib/sdk/domains/pos";
import { CustomerPicker } from "./CustomerPicker";
import { cardClass, errorMessage, errorTextClass, formatMoney, inputClass, labelClass, primaryButtonClass } from "./ui";

interface CartLine {
  item: InventoryItem;
  quantity: number;
}

export function SellTab({ containerId }: { containerId: string }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["pos", "items", containerId],
    queryFn: () => sdk.inventory.listItems(containerId, "active"),
  });

  const currency = cart[0]?.item.price.currency ?? items?.[0]?.price.currency ?? "";
  const total = cart.reduce((sum, l) => sum + l.item.price.total * l.quantity, 0);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (items ?? []).filter((i) => !needle || i.title.toLowerCase().includes(needle));
  }, [items, search]);

  const addToCart = (item: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) return prev.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { item, quantity: 1 }];
    });
  };
  const setQuantity = (itemId: string, quantity: number) =>
    setCart((prev) => (quantity <= 0 ? prev.filter((l) => l.item.id !== itemId) : prev.map((l) => (l.item.id === itemId ? { ...l, quantity } : l))));
  const removeLine = (itemId: string) => setCart((prev) => prev.filter((l) => l.item.id !== itemId));
  const lineInputs: SaleLineInput[] = cart.map((l) => ({ item_id: l.item.id, quantity: l.quantity }));

  const startNewSale = () => { setReceipt(null); setCart([]); };

  if (receipt) {
    return <Receipt sale={receipt} onNewSale={startNewSale} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <input className={inputClass} placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isLoading && <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
        {error && <p className={`mt-3 ${errorTextClass}`}>{errorMessage(error, "Couldn't load items.")}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addToCart(item)}
              className={`flex flex-col items-start gap-1 p-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 ${cardClass}`}
            >
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">{formatMoney(item.price.total, item.price.currency)}</span>
            </button>
          ))}
          {items && visible.length === 0 && <p className="col-span-full text-sm text-neutral-500 dark:text-neutral-500">No items match.</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className={`flex flex-col ${cardClass}`}>
          <div className="border-b border-neutral-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-800">Cart</div>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
            {cart.map((l) => (
              <li key={l.item.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.item.title}</span>
                <input
                  className="w-14 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-center text-xs dark:border-neutral-700 dark:bg-neutral-900"
                  type="number" min={1} value={l.quantity}
                  onChange={(e) => setQuantity(l.item.id, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
                <span className="w-20 flex-none text-right text-xs">{formatMoney(l.item.price.total * l.quantity, l.item.price.currency)}</span>
                <button type="button" onClick={() => removeLine(l.item.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">✕</button>
              </li>
            ))}
            {cart.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">Tap an item to add it.</li>}
          </ul>
          {cart.length > 0 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-800">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <PaymentPanel containerId={containerId} lines={lineInputs} total={total} currency={currency} onComplete={setReceipt} />
        )}
      </div>
    </div>
  );
}

function PaymentPanel({
  containerId, lines, total, currency, onComplete,
}: { containerId: string; lines: SaleLineInput[]; total: number; currency: string; onComplete: (sale: Sale) => void }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();

  const tenderedMinor = Math.round((Number(tendered) || 0) * 100);
  const change = tenderedMinor - total;

  const complete = useMutation({
    mutationFn: () => {
      if (method === "cash") return sdk.pos.ringUpCashSale(containerId, lines, tenderedMinor, customer?.id);
      if (method === "direct") return sdk.pos.ringUpDirectSale(containerId, lines, reference.trim(), customer?.id);
      return sdk.pos.ringUpCreditSale(containerId, lines, (customer as Customer).id);
    },
    onSuccess: (sale) => { queryClient.invalidateQueries({ queryKey: ["pos", "sales", containerId] }); onComplete(sale); },
  });

  const ready =
    method === "cash" ? tenderedMinor >= total :
    method === "direct" ? reference.trim().length > 0 :
    !!customer;

  return (
    <div className={`mt-3 p-4 ${cardClass}`}>
      <div className="grid grid-cols-3 gap-1.5">
        {(["cash", "direct", "credit"] as PaymentMethod[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              method === m ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
            }`}
          >
            {m === "cash" ? "Cash" : m === "direct" ? "Card / mobile" : "On credit"}
          </button>
        ))}
      </div>

      {method === "cash" && (
        <div className="mt-3">
          <label className={`mb-1 block ${labelClass}`}>Amount tendered</label>
          <input className={inputClass} type="number" min="0" step="0.01" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="0.00" />
          {tendered && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{change >= 0 ? `Change: ${formatMoney(change, currency)}` : `Short by ${formatMoney(-change, currency)}`}</p>}
        </div>
      )}
      {method === "direct" && (
        <div className="mt-3">
          <label className={`mb-1 block ${labelClass}`}>Payment reference</label>
          <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction id from the payment" />
        </div>
      )}
      {method === "credit" && (
        <div className="mt-3">
          <label className={`mb-1 block ${labelClass}`}>Customer</label>
          <CustomerPicker containerId={containerId} customerId={customer?.id ?? null} currency={currency} onPick={setCustomer} />
        </div>
      )}

      {(method === "cash" || method === "direct") && (
        <div className="mt-3">
          <label className={`mb-1 block ${labelClass}`}>Customer (optional)</label>
          <CustomerPicker containerId={containerId} customerId={customer?.id ?? null} currency={currency} onPick={setCustomer} />
        </div>
      )}

      <button type="button" onClick={() => complete.mutate()} disabled={!ready || complete.isPending} className={`mt-3 w-full ${primaryButtonClass}`}>
        {complete.isPending ? "Completing sale…" : `Complete sale — ${formatMoney(total, currency)}`}
      </button>
      {complete.isError && <p className={`mt-2 ${errorTextClass}`}>{errorMessage(complete.error, "Couldn't complete the sale.")}</p>}
    </div>
  );
}

function Receipt({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  return (
    <div className={`mx-auto max-w-sm p-5 ${cardClass}`}>
      <h2 className="text-sm font-semibold">Sale complete</h2>
      <ul className="mt-3 flex flex-col divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
        {sale.lines.map((l) => (
          <li key={l.item_id} className="flex items-center justify-between py-1.5">
            <span>{l.title} × {l.quantity}</span>
            <span>{formatMoney(l.line_total, sale.currency)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold dark:border-neutral-800">
        <span>Total</span>
        <span>{formatMoney(sale.total, sale.currency)}</span>
      </div>
      {sale.payment_method === "cash" && sale.change_given !== null && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Change given: {formatMoney(sale.change_given, sale.currency)}</p>
      )}
      {sale.payment_method === "credit" && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Charged to the customer's account.</p>}
      {sale.payment_method === "direct" && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Reference: {sale.payment_reference}</p>}
      <button type="button" onClick={onNewSale} className={`mt-4 w-full ${primaryButtonClass}`}>New sale</button>
    </div>
  );
}
