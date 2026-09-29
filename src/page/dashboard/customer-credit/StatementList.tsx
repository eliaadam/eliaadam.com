import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { badgeClass, cardClass, errorMessage, errorTextClass, formatDateTime, formatMoney, transactionKindClasses, transactionKindLabel } from "./ui";

export function StatementList({ containerId, customerId, currency }: { containerId: string; customerId: string; currency: string }) {
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["customer-credit", "transactions", containerId, customerId],
    queryFn: () => sdk.customerCredit.listTransactions(containerId, customerId, 50),
  });

  if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading statement…</p>;
  if (error) return <p className={errorTextClass}>{errorMessage(error, "Couldn't load the statement.")}</p>;
  if (!transactions) return null;

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-500">Statement</div>
      <ul className={`flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900 ${cardClass}`}>
        {transactions.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
            <span className={`${badgeClass} ${transactionKindClasses(t.kind)}`}>{transactionKindLabel(t.kind)}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-500">{formatDateTime(t.created_at)}</span>
            <span className="min-w-0 flex-1 truncate">{t.description}{t.reason ? ` — ${t.reason}` : ""}</span>
            <span className={t.delta < 0 ? "text-emerald-700 dark:text-emerald-400" : ""}>
              {t.delta > 0 ? "+" : ""}{formatMoney(t.delta, currency)}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-500">bal {formatMoney(t.balance_after, currency)}</span>
          </li>
        ))}
        {transactions.length === 0 && <li className="px-3 py-4 text-center text-sm text-neutral-500 dark:text-neutral-500">No transactions yet.</li>}
      </ul>
    </div>
  );
}
