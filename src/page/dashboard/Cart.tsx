import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { sdk, type Order } from "../../lib/sdk";

import { useContainer } from "../../components/context/ContainerContext";
import { useCart, type CartItem } from "../../context/CartContext";

/**
 * The first real caller of capabilities.core.order's own multi-line
 * CreateOrderDto — built for exactly this, never actually exercised
 * until now (BuyForm's own createOrder() call has always sent
 * exactly one line). One checkout, possibly several vendors, possibly
 * several units of the same listing — each unit still becomes its
 * own independent surfacing.purchase() call underneath, grouped into
 * one Order (see capabilities.core.order's own domain/entities.py
 * module docstring for the full reasoning).
 *
 * SAME WALLET FOR EVERY LINE — matching CreateOrderDto's own
 * documented constraint (capabilities.core.order.application.dtos.
 * CreateOrderDto.paying_wallet_id's own docstring: "a buyer wanting
 * to pay different lines from different wallets isn't supported").
 * One wallet picker for the whole cart, not per-line.
 *
 * MIXED CURRENCIES: each listing carries its own currency
 * independently; summing across different currencies into one number
 * would be meaningless, so the subtotal groups by currency instead of
 * assuming they all match.
 */

function formatPrice(price: number, currency: string) {
  return `${currency} ${(price / 100).toFixed(2)}`;
}

function lineTotal(item: CartItem): number {
  if (item.listing.pricing_mode === "free") return 0;
  return item.listing.price * item.quantity;
}

export function Cart() {
  const { items, updateQuantity, removeItem, clear } = useCart();
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();

  const [walletId, setWalletId] = useState("");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.order.createOrder({
        paying_wallet_id: walletId,
        lines: items.map((i) => ({
          listing_id: i.listing.id,
          quantity: i.quantity,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surfacing"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      clear();
    },
  });

  const currencyTotals = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.listing.currency] = (acc[i.listing.currency] ?? 0) + lineTotal(i);
    return acc;
  }, {});

  const orderResult = mutation.data;

  if (orderResult) {
    return (
      <CheckoutResult order={orderResult} onDone={() => mutation.reset()} />
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight">Cart</h1>
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <ShoppingCart
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">Your cart is empty</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            Add items from the Marketplace to check out together.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">Cart</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {items.reduce((sum, i) => sum + i.quantity, 0)} item
        {items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "" : "s"}
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((item) => (
          <CartLineRow
            key={item.listing.id}
            item={item}
            onQuantityChange={(q) => updateQuantity(item.listing.id, q)}
            onRemove={() => removeItem(item.listing.id)}
          />
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-1">
        {Object.entries(currencyTotals).map(([currency, total]) => (
          <p
            key={currency}
            className="text-sm text-neutral-600 dark:text-neutral-400"
          >
            Subtotal ({currency}):{" "}
            <span className="font-medium text-black dark:text-white">
              {formatPrice(total, currency)}
            </span>
          </p>
        ))}
      </div>

      {!currentContainerId ? (
        <p className="mt-4 text-xs leading-5 text-neutral-500 dark:text-neutral-500">
          Select a container first to choose a wallet to pay from.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/30 dark:focus:border-white"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            <option value="">Pay from…</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label || w.owner_type} ({w.currency}{" "}
                {(w.balance / 100).toFixed(2)})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!walletId || mutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {mutation.isPending ? "Checking out…" : "Checkout"}
          </button>

          {mutation.isError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
              Couldn't complete checkout. Something unexpected went wrong — try
              again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CartLineRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const isFree = item.listing.pricing_mode === "free";
  const isSubscription = item.listing.pricing_mode === "subscription";

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.listing.title}</p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
          {isFree
            ? "Free"
            : `${formatPrice(item.listing.price, item.listing.currency)}${isSubscription ? " · Subscription" : ""}`}
        </p>
      </div>

      <div className="flex flex-none items-center gap-3">
        {!isSubscription && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity - 1)}
              aria-label="Decrease quantity"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              <Minus size={12} />
            </button>
            <span className="w-5 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity + 1)}
              aria-label="Increase quantity"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              <Plus size={12} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove from cart"
          className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function CheckoutResult({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">
        {order.status === "completed"
          ? "Order placed"
          : "Order placed — some issues"}
      </h1>

      <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {order.line_results.map((line, i) => {
          const isClean =
            line.purchase_status === "completed" ||
            line.purchase_status === "subscribed";
          return (
            <li
              key={line.purchase_id ?? i}
              className="flex items-start gap-2 px-4 py-3 text-sm"
            >
              {isClean ? (
                <CheckCircle2
                  size={15}
                  className="mt-0.5 flex-none text-emerald-600 dark:text-emerald-400"
                />
              ) : (
                <AlertTriangle
                  size={15}
                  className="mt-0.5 flex-none text-red-600 dark:text-red-400"
                />
              )}
              <div className="min-w-0">
                <p className="capitalize">
                  {line.purchase_status.replace("_", " ")}
                </p>
                {line.error && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {line.error}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onDone}
        className="mt-4 text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
      >
        Back to cart
      </button>
    </div>
  );
}
