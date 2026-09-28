import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { ReportColumn, ReportResult } from "../../../lib/sdk/domains/finance";
import {
  badgeClass, cardClass, errorMessage, errorTextClass, flattenAccounts, formatCell, inputClass, labelClass,
  primaryButtonClass, selectClass,
} from "./ui";

export function ReportsTab({ containerId }: { containerId: string }) {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["finance", "reports", containerId],
    queryFn: () => sdk.finance.listReports(containerId),
  });
  const { data: accounts } = useQuery({ queryKey: ["finance", "accounts", containerId], queryFn: () => sdk.finance.listAccounts(containerId) });
  const { data: settings } = useQuery({ queryKey: ["finance", "settings", containerId], queryFn: () => sdk.finance.getSettings(containerId) });

  const [code, setCode] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});

  const report = reports?.find((r) => r.code === code) ?? null;
  const currency = settings?.base_currency ?? "";

  const run = useMutation({ mutationFn: () => sdk.finance.runReport(containerId, code, params) });

  const flatAccounts = useMemo(() => flattenAccounts(accounts ?? []), [accounts]);

  const selectReport = (next: string) => {
    setCode(next);
    setParams({});
    run.reset();
  };

  const canRun = report ? report.params.every((p) => !p.required || params[p.name]) : false;

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load reports. Have the books been opened?")}</p>}

      {reports && (
        <div className={`p-4 ${cardClass}`}>
          <label className={`mb-1 block ${labelClass}`}>Report</label>
          <select className={`${selectClass} max-w-sm`} value={code} onChange={(e) => selectReport(e.target.value)}>
            <option value="">Choose a report…</option>
            {reports.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
          {report?.description && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{report.description}</p>}

          {report && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {report.params.map((p) => (
                <div key={p.name}>
                  <label className={`mb-1 block ${labelClass}`}>
                    {p.label}
                    {p.required && " *"}
                  </label>
                  {p.kind === "date" && (
                    <input
                      className={`${inputClass} w-40`}
                      type="date"
                      value={params[p.name] ?? ""}
                      onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    />
                  )}
                  {p.kind === "account" && (
                    <select
                      className={`${selectClass} w-56`}
                      value={params[p.name] ?? ""}
                      onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    >
                      <option value="">Choose an account…</option>
                      {flatAccounts.map(({ account, depth }) => (
                        <option key={account.id} value={account.id}>{"—".repeat(depth)} {account.code} · {account.name}</option>
                      ))}
                    </select>
                  )}
                  {p.kind === "text" && (
                    <input
                      className={`${inputClass} w-56`}
                      value={params[p.name] ?? ""}
                      onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <button type="button" onClick={() => run.mutate()} disabled={!canRun || run.isPending} className={primaryButtonClass}>
                {run.isPending ? "Running…" : "Run report"}
              </button>
            </div>
          )}
          {run.isError && <p className={`mt-2 ${errorTextClass}`}>{errorMessage(run.error, "Couldn't run that report.")}</p>}
        </div>
      )}

      {run.data && <ReportResultTable result={run.data} currency={currency} />}
    </div>
  );
}

function ReportResultTable({ result, currency }: { result: ReportResult; currency: string }) {
  const { columns, rows, totals, meta } = result;
  const totalKeys = Object.keys(totals);

  return (
    <div className={`overflow-x-auto ${cardClass}`}>
      {typeof meta.balanced === "boolean" && (
        <div className="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <span className={badgeClass}>{meta.balanced ? "Balanced" : "Not balanced"}</span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2 font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {rows.map((row, i) => {
            const depth = typeof row.depth === "number" ? row.depth : 0;
            const isHeading = row.kind === "section" || row.kind === "total" || row.kind === "computed";
            return (
              <tr key={i} className={isHeading ? "font-medium" : ""}>
                {columns.map((c, ci) => (
                  <td key={c.key} className="px-4 py-1.5" style={ci === 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}>
                    {formatCell(row[c.key] ?? (isHeading && c.key === "name" ? row.label : undefined), c as ReportColumn, currency)}
                  </td>
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No data for this range.</td>
            </tr>
          )}
        </tbody>
        {totalKeys.length > 0 && (
          <tfoot>
            <tr className="border-t border-neutral-200 text-xs font-medium dark:border-neutral-800">
              <td className="px-4 py-2" colSpan={columns.length}>
                {totalKeys.map((k) => (
                  <span key={k} className="mr-4">
                    {k.replace(/_/g, " ")}: {typeof totals[k] === "number" ? formatCell(totals[k], { key: k, label: k, kind: "money" } as ReportColumn, currency) : String(totals[k])}
                  </span>
                ))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
