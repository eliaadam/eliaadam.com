import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: "draft" | "pending" | "approved" | "voided";
  created_at: string;
}

// Local state — in production this would be a backend API
let invoiceStore: Invoice[] = [];
let invoiceCounter = 1000;

export default function InvoicingPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = permissions.includes("invoice.create");
  const canView = permissions.includes("invoice.view");
  const canApprove = permissions.includes("invoice.approve");
  const canVoid = permissions.includes("invoice.void");

  const invoicesQuery = useQuery({
    queryKey: ["workspace", "invoices", containerId],
    queryFn: () => invoiceStore.filter(() => canView) as Invoice[],
    enabled: canView,
  });

  const invoices = invoicesQuery.data ?? [];

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-black dark:text-white m-0">
            Invoicing
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mt-0.5">
            {canView
              ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
              : "View access required"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermBadge label="create" allowed={canCreate} />
          <PermBadge label="view" allowed={canView} />
          <PermBadge label="approve" allowed={canApprove} />
          <PermBadge label="void" allowed={canVoid} />
        </div>
      </div>

      {/* Create form */}
      {canCreate && (
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          {showCreate ? (
            <CreateInvoiceForm
              containerId={containerId}
              onCreated={() => {
                setShowCreate(false);
                queryClient.invalidateQueries({
                  queryKey: ["workspace", "invoices", containerId],
                });
              }}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold text-black dark:text-white"
            >
              + New Invoice
            </button>
          )}
        </div>
      )}

      {/* No view access */}
      {!canView && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            You don't have permission to view invoices.
          </p>
        </div>
      )}

      {/* Invoice list */}
      {canView && invoices.length === 0 && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            No invoices yet.{canCreate ? " Create one above." : ""}
          </p>
        </div>
      )}

      {canView &&
        invoices.map((inv) => (
          <InvoiceRow
            key={inv.id}
            invoice={inv}
            canApprove={canApprove}
            canVoid={canVoid}
            containerId={containerId}
          />
        ))}
    </div>
  );
}

function CreateInvoiceForm({
  containerId,
  onCreated,
  onCancel,
}: {
  containerId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      invoiceCounter++;
      const invoice: Invoice = {
        id: crypto.randomUUID(),
        number: `INV-${invoiceCounter}`,
        client,
        amount: parseFloat(amount),
        status: "draft",
        created_at: new Date().toISOString(),
      };
      invoiceStore = [invoice, ...invoiceStore];
      return invoice;
    },
    onSuccess: onCreated,
  });

  const inputCls =
    "px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          Client
        </label>
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Client name"
          className={`${inputCls} w-48`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={`${inputCls} w-32`}
        />
      </div>
      <button
        onClick={() => createMutation.mutate()}
        disabled={!client || !amount}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        Create
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
      >
        Cancel
      </button>
    </div>
  );
}

function InvoiceRow({
  invoice: inv,
  canApprove,
  canVoid,
  containerId,
}: {
  invoice: Invoice;
  canApprove: boolean;
  canVoid: boolean;
  containerId: string;
}) {
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: async (action: "approve" | "void") => {
      invoiceStore = invoiceStore.map((i) =>
        i.id === inv.id
          ? { ...i, status: action === "approve" ? "approved" : "voided" }
          : i,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["workspace", "invoices", containerId],
      }),
  });

  const statusColors: Record<string, string> = {
    draft:
      "border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500",
    pending: "border-neutral-400 text-neutral-600 dark:text-neutral-400",
    approved: "bg-black text-white dark:bg-white dark:text-black",
    voided:
      "border-neutral-300 dark:border-neutral-700 text-neutral-400 line-through",
  };

  return (
    <div className="px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono font-semibold text-black dark:text-white w-24">
          {inv.number}
        </span>
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          {inv.client}
        </span>
        <span className="text-sm font-semibold text-black dark:text-white">
          ${inv.amount.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase border ${statusColors[inv.status]}`}
        >
          {inv.status}
        </span>

        {inv.status === "draft" && canApprove && (
          <button
            onClick={() => actionMutation.mutate("approve")}
            className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Approve
          </button>
        )}

        {["draft", "pending", "approved"].includes(inv.status) &&
          canVoid &&
          inv.status !== "voided" && (
            <button
              onClick={() => actionMutation.mutate("void")}
              className="px-3 py-1 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-black dark:hover:text-white transition"
            >
              Void
            </button>
          )}
      </div>
    </div>
  );
}

function PermBadge({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
        allowed
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 line-through"
      }`}
    >
      {label}
    </span>
  );
}
