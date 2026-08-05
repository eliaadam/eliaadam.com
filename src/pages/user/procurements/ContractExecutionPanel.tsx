import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi as api, toMajor } from "./procurement-api";

type Fin = {
  contract_id: string;
  reference: string;
  currency: string;
  original_sum: number;
  approved_variations: number;
  effective_sum: number;
  certified_gross_to_date: number;
  retention_held: number;
  advance_amount: number;
  advance_outstanding: number;
  paid_to_date: number;
  vat_paid_to_date: number;
  retention_bps: number;
  retention_limit_bps: number;
  vat_bps: number;
  advance_recovery_bps: number;
  execution_status: string;
};
type Valuation = {
  id: string;
  sequence_no: number;
  kind: string;
  status: string;
  gross_work_done: number;
  work_this_period: number;
  retention_this: number;
  retention_cumulative: number;
  advance_recovery_this: number;
  vat_amount: number;
  net_payable: number;
  currency: string;
  certified_at: string | null;
  paid_at: string | null;
};

/** Post-award contract execution (PayTrack): financials, IPCs, retention. */
export default function ContractExecutionPanel({
  containerId,
  contractId,
  canManage,
  canCertify,
  onClose,
}: {
  containerId: string;
  contractId: string;
  canManage: boolean;
  canCertify: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [gross, setGross] = useState("");

  const fin = useQuery({
    queryKey: ["contract", "fin", contractId],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/contracts/${contractId}/financials`,
      ),
  });
  const vals = useQuery({
    queryKey: ["contract", "vals", contractId],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/contracts/${contractId}/valuations`,
      ),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["contract", "fin", contractId] });
    qc.invalidateQueries({ queryKey: ["contract", "vals", contractId] });
  };

  const advance = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/contracts/${contractId}/advance`),
    onSuccess: () => {
      setMsg("Advance paid.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });
  const createVal = useMutation({
    mutationFn: () =>
      api(
        "POST",
        `/containers/${containerId}/contracts/${contractId}/valuations`,
        { gross_work_done: Math.round(parseFloat(gross || "0") * 100) },
      ),
    onSuccess: () => {
      setMsg("Draft IPC created.");
      setGross("");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });
  const certify = useMutation({
    mutationFn: (id: string) =>
      api(
        "POST",
        `/containers/${containerId}/contracts/${contractId}/valuations/${id}/certify`,
      ),
    onSuccess: () => {
      setMsg("IPC certified.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });
  const pay = useMutation({
    mutationFn: (id: string) =>
      api(
        "POST",
        `/containers/${containerId}/contracts/${contractId}/valuations/${id}/pay`,
      ),
    onSuccess: () => {
      setMsg("IPC paid — funds transferred to supplier.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });
  const release = useMutation({
    mutationFn: () =>
      api(
        "POST",
        `/containers/${containerId}/contracts/${contractId}/retention/release`,
        { amount: f!.retention_held, reason: "final" },
      ),
    onSuccess: () => {
      setMsg("Retention released.");
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const f: Fin | undefined = fin.data;
  const list: Valuation[] = Array.isArray(vals.data) ? vals.data : [];
  if (!f)
    return (
      <div className="p-6 text-sm text-neutral-500">Loading contract…</div>
    );

  const Row = ({
    label,
    value,
    accent,
  }: {
    label: string;
    value: string;
    accent?: string;
  }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={accent ?? "text-black dark:text-white"}>{value}</span>
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
        Contract {f.reference}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.execution_status === "completed" ? "bg-green-100 dark:bg-green-900/40 text-green-700" : "bg-blue-100 dark:bg-blue-900/40 text-blue-700"}`}
        >
          {f.execution_status}
        </span>
      </div>
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {/* Financial position */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
        <div className="text-sm font-medium text-black dark:text-white mb-1">
          Financial position ({f.currency})
        </div>
        <Row label="Original contract sum" value={toMajor(f.original_sum)} />
        {f.approved_variations !== 0 && (
          <Row
            label="Approved variations"
            value={toMajor(f.approved_variations)}
            accent="text-amber-600"
          />
        )}
        <Row label="Effective sum" value={toMajor(f.effective_sum)} />
        <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
        <Row
          label="Certified work to date"
          value={toMajor(f.certified_gross_to_date)}
        />
        <Row
          label={`Retention held (${(f.retention_bps / 100).toFixed(1)}%, cap ${(f.retention_limit_bps / 100).toFixed(1)}%)`}
          value={toMajor(f.retention_held)}
          accent="text-purple-600"
        />
        {f.advance_amount > 0 && (
          <Row
            label="Advance outstanding"
            value={toMajor(f.advance_outstanding)}
            accent="text-orange-600"
          />
        )}
        <Row
          label="Paid to date (net cash)"
          value={toMajor(f.paid_to_date)}
          accent="text-green-600"
        />
        <Row
          label={`VAT paid (${(f.vat_bps / 100).toFixed(0)}%)`}
          value={toMajor(f.vat_paid_to_date)}
        />
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {f.advance_amount > 0 &&
            f.advance_outstanding === 0 &&
            f.paid_to_date === 0 && (
              <button
                onClick={() => advance.mutate()}
                className="px-3 py-1.5 text-xs rounded-md border border-orange-400 text-orange-600"
              >
                Pay advance ({toMajor(f.advance_amount)})
              </button>
            )}
          {f.retention_held > 0 && f.execution_status === "completed" && (
            <button
              onClick={() => release.mutate()}
              className="px-3 py-1.5 text-xs rounded-md border border-purple-400 text-purple-600"
            >
              Release retention ({toMajor(f.retention_held)})
            </button>
          )}
        </div>
      )}

      {/* Create IPC */}
      {canManage && f.execution_status === "active" && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[11px] text-neutral-500">
              New IPC — cumulative work done to date ({f.currency})
            </label>
            <input
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
          </div>
          <button
            onClick={() => createVal.mutate()}
            disabled={!gross || createVal.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Create IPC
          </button>
        </div>
      )}

      {/* IPCs with the cascade */}
      <div>
        <div className="text-sm font-medium text-black dark:text-white mb-2">
          Payment certificates
        </div>
        {list.length === 0 ? (
          <div className="text-sm text-neutral-500">No IPCs yet.</div>
        ) : (
          <div className="space-y-2">
            {list.map((v) => (
              <div
                key={v.id}
                className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    IPC #{v.sequence_no}{" "}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {v.kind}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.status === "paid" ? "bg-green-100 dark:bg-green-900/40 text-green-700" : v.status === "certified" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {v.status === "draft" && canCertify && (
                      <button
                        onClick={() => certify.mutate(v.id)}
                        className="px-2 py-1 text-[11px] rounded border border-blue-400 text-blue-600"
                      >
                        Certify
                      </button>
                    )}
                    {v.status === "certified" && canManage && (
                      <button
                        onClick={() => pay.mutate(v.id)}
                        className="px-2 py-1 text-[11px] rounded bg-green-600 text-white"
                      >
                        Pay {toMajor(v.net_payable)}
                      </button>
                    )}
                  </div>
                </div>
                {/* the cascade */}
                <div className="mt-2 text-[11px] text-neutral-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Work this period</span>
                    <span>{toMajor(v.work_this_period)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Less retention</span>
                    <span className="text-purple-600">
                      −{toMajor(v.retention_this)}
                    </span>
                  </div>
                  {v.advance_recovery_this > 0 && (
                    <div className="flex justify-between">
                      <span>Less advance recovery</span>
                      <span className="text-orange-600">
                        −{toMajor(v.advance_recovery_this)}
                      </span>
                    </div>
                  )}
                  {v.vat_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Plus VAT</span>
                      <span>+{toMajor(v.vat_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-black dark:text-white border-t border-neutral-100 dark:border-neutral-800 pt-0.5">
                    <span>Net payable</span>
                    <span>
                      {toMajor(v.net_payable)} {v.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
