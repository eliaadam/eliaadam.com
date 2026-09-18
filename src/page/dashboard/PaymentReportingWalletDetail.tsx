import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type { TransactionReport } from "../../lib/sdk/domains/paymentReporting";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/**
 * One wallet's own detail + its full transaction history — the
 * drill-down from PaymentReporting.tsx's own Wallets tab. Same
 * admin-only, admin-container-scoped gate as the parent page.
 */
export function PaymentReportingWalletDetail() {
  const { walletId } = useParams<{ walletId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-reporting", "wallet-detail", walletId],
    queryFn: () => sdk.paymentReporting.getWalletDetail(walletId!),
    enabled: Boolean(walletId),
  });

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/payment-reporting"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to payment reporting
      </Link>

      {isError && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You don't have permission to view platform-wide payment reporting.
        </p>
      )}

      {isLoading && !isError && (
        <div className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      )}

      {data && !data.wallet && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Wallet not found.
        </p>
      )}

      {data?.wallet && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">
            {data.wallet.label || data.wallet.owner_type || "Wallet"}
          </h1>
          <p className="mt-1 text-2xl font-semibold">
            {formatAmount(data.wallet.balance, data.wallet.currency)}
          </p>

          <dl className="mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-500">Type</dt>
              <dd className="font-medium">{data.wallet.owner_type ?? "—"}</dd>
            </div>
            {data.wallet.container_id && (
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-500">
                  Container
                </dt>
                <dd className="font-mono text-xs">
                  {data.wallet.container_id}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-500">Status</dt>
              <dd>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium dark:bg-neutral-800">
                  {data.wallet.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-500">
                Overdraft allowed
              </dt>
              <dd className="font-medium">
                {data.wallet.allow_negative ? "Yes" : "No"}
              </dd>
            </div>
          </dl>

          <h2 className="mt-8 text-sm font-semibold tracking-tight">
            Transaction history
          </h2>

          {data.transactions.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
              No transactions touch this wallet yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {data.transactions.map((txn) => (
                <WalletTransactionRow
                  key={txn.id}
                  transaction={txn}
                  walletId={walletId!}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function WalletTransactionRow({
  transaction,
  walletId,
}: {
  transaction: TransactionReport;
  walletId: string;
}) {
  const ownEntry = transaction.entries.find((e) => e.account_id === walletId);

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <ArrowLeftRight size={14} className="flex-none text-neutral-400" />
        <div>
          <p className="text-sm font-medium capitalize">{transaction.kind}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            {transaction.description} · {formatDate(transaction.posted_at)}
          </p>
        </div>
      </div>
      {ownEntry && (
        <span
          className={`text-sm font-semibold ${
            ownEntry.amount < 0
              ? "text-red-600 dark:text-red-400"
              : "text-black dark:text-white"
          }`}
        >
          {ownEntry.amount > 0 ? "+" : ""}
          {formatAmount(ownEntry.amount, ownEntry.currency)}
        </span>
      )}
    </li>
  );
}
