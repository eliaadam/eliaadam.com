import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  procurementApi as api,
  fmtDate,
  scopeBase,
  toMajor,
  type OwnerScope,
} from "./procurement-api";

type Contract = {
  id: string;
  reference: string;
  title: string;
  status: string;
  currency: string;
  value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  tender_reference?: string | null;
  counterparty_name?: string | null;
};

type ContractsPanelProps = {
  containerId: string;
  permissions: string[];
};

export default function ContractsPanel({
  containerId,
  permissions,
}: ContractsPanelProps) {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );

  const scope: OwnerScope = {
    type: "container",
    containerId,
  };

  const canView = permissions.includes("system.procurement.contract.view");

  const contracts = useQuery({
    queryKey: ["procurement", "contracts", containerId],
    queryFn: () => api("GET", `${scopeBase(scope)}/contracts`),
    enabled: canView && Boolean(containerId),
  });

  const list: Contract[] = Array.isArray(contracts.data) ? contracts.data : [];

  if (!canView) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have permission to view contracts here.
      </div>
    );
  }

  if (selectedContract) {
    return (
      <ContractDetails
        scope={scope}
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        permissions={permissions}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-black dark:text-white">
          Contracts
        </h2>

        <p className="text-[11px] text-neutral-500 mt-0.5">
          Awarded contracts and post-award execution.
        </p>
      </div>

      {contracts.isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : contracts.isError ? (
        <div className="text-sm text-red-600">Failed to load contracts.</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No contracts found.</div>
      ) : (
        <div className="space-y-2">
          {list.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onOpen={() => setSelectedContract(contract)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractCard({
  contract,
  onOpen,
}: {
  contract: Contract;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left border border-neutral-200 dark:border-neutral-800 rounded-md p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-black dark:text-white truncate">
              {contract.title}
            </div>

            <StatusBadge status={contract.status} />
          </div>

          <div className="text-[11px] text-neutral-400 mt-0.5">
            {contract.reference}
          </div>

          {contract.counterparty_name && (
            <div className="text-[11px] text-neutral-500 mt-1">
              Counterparty: {contract.counterparty_name}
            </div>
          )}

          <div className="text-[11px] text-neutral-400 mt-1">
            {contract.starts_at && <>Starts {fmtDate(contract.starts_at)}</>}

            {contract.ends_at && (
              <>
                {" · "}
                Ends {fmtDate(contract.ends_at)}
              </>
            )}

            {contract.value !== null && (
              <>
                {" · "}
                {toMajor(contract.value)} {contract.currency}
              </>
            )}
          </div>
        </div>

        <span className="shrink-0 text-xs text-neutral-500">View →</span>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
      {status}
    </span>
  );
}

function ContractDetails({
  scope,
  contract,
  onClose,
  permissions,
}: {
  scope: OwnerScope;
  contract: Contract;
  onClose: () => void;
  permissions: string[];
}) {
  const canManage = permissions.includes("system.procurement.contract.manage");

  const details = useQuery({
    queryKey: ["procurement", "contract", scope, contract.id],
    queryFn: () => api("GET", `${scopeBase(scope)}/contracts/${contract.id}`),
  });

  const data: Contract = details.data ?? contract;

  return (
    <div className="p-4 space-y-4">
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← Back to contracts
      </button>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {data.title}
          </h2>

          <StatusBadge status={data.status} />
        </div>

        <div className="text-[11px] text-neutral-400 mt-1">
          {data.reference}
        </div>
      </div>

      {details.isLoading ? (
        <div className="text-sm text-neutral-500">Loading contract…</div>
      ) : details.isError ? (
        <div className="text-sm text-red-600">
          Failed to load contract details.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Info
              label="Contract value"
              value={
                data.value !== null
                  ? `${toMajor(data.value)} ${data.currency}`
                  : "—"
              }
            />

            <Info label="Counterparty" value={data.counterparty_name ?? "—"} />

            <Info label="Start date" value={fmtDate(data.starts_at)} />

            <Info label="End date" value={fmtDate(data.ends_at)} />

            <Info label="Tender" value={data.tender_reference ?? "—"} />

            <Info label="Status" value={data.status} />
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="text-sm font-semibold text-black dark:text-white">
              Contract execution
            </div>

            <div className="text-[11px] text-neutral-500 mt-1">
              Post-award execution tools such as IPCs, retention, variations,
              and payments belong here.
            </div>

            {canManage ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <ExecutionAction label="IPCs" />
                <ExecutionAction label="Retention" />
                <ExecutionAction label="Variations" />
                <ExecutionAction label="Payments" />
              </div>
            ) : (
              <div className="mt-3 text-xs text-neutral-500">
                You have view-only access to this contract.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>

      <div className="text-sm text-black dark:text-white mt-1">{value}</div>
    </div>
  );
}

function ExecutionAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-left px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
    >
      <div className="text-xs font-medium text-black dark:text-white">
        {label}
      </div>

      <div className="text-[10px] text-neutral-500 mt-0.5">
        Manage {label.toLowerCase()}
      </div>
    </button>
  );
}
