import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus } from "lucide-react";
import type { Expense, ExpenseRequest, ExpenseStatus } from "../../../lib/sdk/domains/projects";
import { sdk } from "../../../lib/sdk";
 
/**
 * Two paths into the same Expense shape — direct creation (starts
 * "pending", needs its own approve/reject) and a domains.requests-
 * backed purchase request (lands directly as "approved" on
 * approval). Matches the backend's own ExpenseApplicationService /
 * ExpenseRequestApplicationService split.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

function expenseStatusClasses(status: ExpenseStatus): string {
  if (status === "paid") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "approved")
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  if (status === "rejected")
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"; // pending
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function BudgetTab({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<"expenses" | "requests">("expenses");
  const [showCreate, setShowCreate] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["projects", "expenses", projectId],
    queryFn: () => sdk.projects.listExpensesForProject(projectId),
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["projects", "expense-requests", projectId],
    queryFn: () => sdk.projects.listExpenseRequestsForProject(projectId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => setTab("expenses")}
            className={tab === "expenses" ? "text-black dark:text-white" : "text-neutral-400 dark:text-neutral-600"}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={tab === "requests" ? "text-black dark:text-white" : "text-neutral-400 dark:text-neutral-600"}
          >
            Requests
          </button>
        </div>
        {tab === "expenses" ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={`flex items-center gap-1 ${primaryButtonClass}`}
          >
            <Plus size={13} />
            {showCreate ? "Close" : "Log expense"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowRequestForm((v) => !v)}
            className={`flex items-center gap-1 ${primaryButtonClass}`}
          >
            <Plus size={13} />
            {showRequestForm ? "Close" : "Request expense"}
          </button>
        )}
      </div>

      {tab === "expenses" && showCreate && (
        <CreateExpenseForm
          projectId={projectId}
          onDone={() => setShowCreate(false)}
        />
      )}
      {tab === "requests" && showRequestForm && (
        <CreateExpenseRequestForm
          projectId={projectId}
          onDone={() => setShowRequestForm(false)}
        />
      )}

      {tab === "expenses" && (
        <>
          {expensesLoading && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Loading…
            </p>
          )}
          {expenses && expenses.length === 0 && !showCreate && (
            <EmptyState label="No expenses logged yet." />
          )}
          {expenses && expenses.length > 0 && (
            <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "requests" && (
        <>
          {requestsLoading && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Loading…
            </p>
          )}
          {requests && requests.length === 0 && !showRequestForm && (
            <EmptyState label="No expense requests yet." />
          )}
          {requests && requests.length > 0 && (
            <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {requests.map((r) => (
                <ExpenseRequestRow key={r.id} request={r} projectId={projectId} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
      <DollarSign
        className="mx-auto text-neutral-400 dark:text-neutral-600"
        size={20}
      />
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
        {label}
      </p>
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "expenses", expense.project_id],
    });

  const approveMutation = useMutation({
    mutationFn: () => sdk.projects.approveExpense(expense.id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => sdk.projects.rejectExpense(expense.id),
    onSuccess: invalidate,
  });
  const markPaidMutation = useMutation({
    mutationFn: () => sdk.projects.markExpensePaid(expense.id),
    onSuccess: invalidate,
  });

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{expense.description}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${expenseStatusClasses(expense.status)}`}
          >
            {expense.status}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
          {formatAmount(expense.amount, expense.currency)}
          {expense.category && ` · ${expense.category}`}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        {expense.status === "pending" && (
          <>
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className={primaryButtonClass}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Reject
            </button>
          </>
        )}
        {expense.status === "approved" && (
          <button
            type="button"
            onClick={() => markPaidMutation.mutate()}
            disabled={markPaidMutation.isPending}
            className={secondaryButtonClass}
          >
            Mark paid
          </button>
        )}
      </div>
    </li>
  );
}

function ExpenseRequestRow({
  request,
  projectId,
}: {
  request: ExpenseRequest;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["projects", "expense-requests", projectId],
    });
    queryClient.invalidateQueries({ queryKey: ["projects", "expenses", projectId] });
  };

  const approveMutation = useMutation({
    mutationFn: () => sdk.projects.approveExpenseRequest(request.id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => sdk.projects.rejectExpenseRequest(request.id, reason || undefined),
    onSuccess: () => {
      setShowRejectForm(false);
      setReason("");
      invalidate();
    },
  });

  const payload = request.payload as {
    description?: string;
    amount?: number;
    currency?: string;
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {payload.description ?? "Expense request"}
            </p>
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${
                request.status === "approved"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : request.status === "rejected"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              }`}
            >
              {request.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            {payload.amount != null && payload.currency
              ? formatAmount(payload.amount, payload.currency)
              : ""}{" "}
            · requested by {request.requester_actor_id}
          </p>
        </div>

        {request.status === "pending" && (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className={primaryButtonClass}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm((v) => !v)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {approveMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't approve this request.
        </p>
      )}

      {showRejectForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-900/10">
          <input
            className={inputClass}
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="flex-none rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function CreateExpenseForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createExpense(projectId, {
        description,
        amount: Math.round(Number(amount) * 100),
        currency: currency.toUpperCase(),
        category: category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "expenses", projectId],
      });
      onDone();
    },
  });

  const canSubmit = Boolean(description.trim() && amount && currency.trim());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Category (optional)
        </label>
        <input
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Logging…" : "Log expense"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't log this expense.
          </p>
        )}
      </div>
    </div>
  );
}

function CreateExpenseRequestForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createExpenseRequest(projectId, {
        description,
        amount: Math.round(Number(amount) * 100),
        currency: currency.toUpperCase(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "expense-requests", projectId],
      });
      onDone();
    },
  });

  const canSubmit = Boolean(description.trim() && amount && currency.trim());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Asks a projects manager to approve this spend — no expense is
        created unless approved.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't send this request.
          </p>
        )}
      </div>
    </div>
  );
}
