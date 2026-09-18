import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Wallet as WalletIcon, ArrowLeftRight } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type {
  ListTransactionsParams,
  ListWalletsParams,
  TransactionReport,
  WalletOwnerType,
  WalletReport,
} from "../../lib/sdk/domains/paymentReporting";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

type TabId = "summary" | "wallets" | "transactions";

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "wallets", label: "Wallets" },
  { id: "transactions", label: "Transactions" },
];

/**
 * Platform-admin only (core.payment.reporting.view, checked against
 * the admin container). A 403 here means the current actor doesn't
 * hold core.payment.platform-reporting-admin on the admin container
 * — not a bug, the endpoint working as designed.
 */
export function PaymentReporting() {
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight">
        Payment reporting
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Platform-wide visibility into every wallet and ledger transaction,
        across every container.
      </p>

      <div className="mt-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "summary" && <SummaryTab />}
        {activeTab === "wallets" && <WalletsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
      </div>
    </div>
  );
}

function SummaryTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-reporting", "summary"],
    queryFn: () => sdk.paymentReporting.getPlatformSummary(),
  });

  if (isError) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        You don't have permission to view platform-wide payment reporting.
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
    );
  }

  const currencies = Object.entries(data.balances_by_currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Total wallets
          </p>
          <p className="mt-1 text-2xl font-semibold">{data.total_wallets}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Total transactions
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {data.total_transactions}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currencies in use
          </p>
          <p className="mt-1 text-2xl font-semibold">{currencies.length}</p>
        </div>
      </div>

      {currencies.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Balances by currency
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {currencies.map(([currency, balance]) => (
              <li
                key={currency}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{currency}</span>
                <span>{formatAmount(balance, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const OWNER_TYPE_OPTIONS: { value: WalletOwnerType | ""; label: string }[] = [
  { value: "", label: "Any type" },
  { value: "container", label: "Container" },
  { value: "personal", label: "Personal" },
  { value: "container_shared", label: "Container-shared" },
  { value: "shared", label: "Shared" },
];

function WalletsTab() {
  const [filters, setFilters] = useState<ListWalletsParams>({
    limit: 50,
    offset: 0,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-reporting", "wallets", filters],
    queryFn: () => sdk.paymentReporting.listWallets(filters),
  });

  if (isError) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        You don't have permission to view platform-wide payment reporting.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={`${inputClass} w-28`}
            placeholder="Any"
            value={filters.currency ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                currency: e.target.value || undefined,
                offset: 0,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Type
          </label>
          <select
            className={inputClass}
            value={filters.owner_type ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                owner_type: (e.target.value || undefined) as
                  | WalletOwnerType
                  | undefined,
                offset: 0,
              }))
            }
          >
            {OWNER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {(!data?.results || data.results.length === 0) && !isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          No wallets match these filters.
        </p>
      )}

      {data?.results && data.results.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {data.results.map((wallet) => (
              <WalletRow key={wallet.id} wallet={wallet} />
            ))}
          </ul>
          <Pagination
            total={data.total}
            limit={filters.limit ?? 50}
            offset={filters.offset ?? 0}
            onOffsetChange={(offset) => setFilters((f) => ({ ...f, offset }))}
          />
        </>
      )}
    </div>
  );
}

function WalletRow({ wallet }: { wallet: WalletReport }) {
  return (
    <li>
      <Link
        to={`/dashboard/payment-reporting/wallets/${wallet.id}`}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <div className="flex items-center gap-3">
          <WalletIcon size={16} className="flex-none text-neutral-400" />
          <div>
            <p className="text-sm font-medium">
              {wallet.label || wallet.owner_type || "Wallet"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {wallet.owner_type ?? "—"}
              {wallet.container_id ? ` · ${wallet.container_id}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            {formatAmount(wallet.balance, wallet.currency)}
          </span>
          <ArrowRight size={14} className="text-neutral-400" />
        </div>
      </Link>
    </li>
  );
}

const TRANSACTION_KIND_OPTIONS = [
  { value: "", label: "Any kind" },
  { value: "payment", label: "Payment" },
  { value: "transfer", label: "Transfer" },
  { value: "reversal", label: "Reversal" },
];

function TransactionsTab() {
  const [filters, setFilters] = useState<ListTransactionsParams>({
    limit: 50,
    offset: 0,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-reporting", "transactions", filters],
    queryFn: () => sdk.paymentReporting.listTransactions(filters),
  });

  if (isError) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        You don't have permission to view platform-wide payment reporting.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Kind
          </label>
          <select
            className={inputClass}
            value={filters.kind ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                kind: e.target.value || undefined,
                offset: 0,
              }))
            }
          >
            {TRANSACTION_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {(!data?.results || data.results.length === 0) && !isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          No transactions match these filters.
        </p>
      )}

      {data?.results && data.results.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {data.results.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </ul>
          <Pagination
            total={data.total}
            limit={filters.limit ?? 50}
            offset={filters.offset ?? 0}
            onOffsetChange={(offset) => setFilters((f) => ({ ...f, offset }))}
          />
        </>
      )}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionReport }) {
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={14} className="flex-none text-neutral-400" />
          <span className="text-sm font-medium capitalize">
            {transaction.kind}
          </span>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          {formatDate(transaction.posted_at)}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {transaction.description}
      </p>
      {(transaction.entries ?? []).length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {(transaction.entries ?? []).map((entry) => (
            <li
              key={entry.id}
              className="flex justify-between font-mono text-xs text-neutral-500 dark:text-neutral-500"
            >
              <span>{entry.account_id}</span>
              <span
                className={
                  entry.amount < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-black dark:text-white"
                }
              >
                {entry.amount > 0 ? "+" : ""}
                {formatAmount(entry.amount, entry.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Pagination({
  total,
  limit,
  offset,
  onOffsetChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}) {
  if (total <= limit) return null;
  const start = offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500 dark:text-neutral-500">
        {start}-{end} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-neutral-700"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={end >= total}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-neutral-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
