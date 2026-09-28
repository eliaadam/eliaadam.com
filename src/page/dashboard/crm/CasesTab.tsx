import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, LifeBuoy, Plus } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { CasePriority, CaseStatus, CrmCase } from "../../../lib/sdk/domains/crm";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

const PRIORITIES: CasePriority[] = ["low", "medium", "high", "urgent"];

// Mirrors the backend's own legal-moves table (domain/transitions.py).
const FORWARD_MOVES: Record<CaseStatus, CaseStatus[]> = {
  new: ["open"],
  open: ["pending", "resolved"],
  pending: ["open", "resolved"],
  resolved: ["closed"],
  closed: [],
};

function priorityClasses(p: CasePriority): string {
  if (p === "urgent") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (p === "high") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export function CasesTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["crm", "cases", containerId],
    queryFn: () => sdk.crm.listCasesForContainer(containerId),
  });

  const visible = (cases ?? []).filter((c) => !(hideClosed && c.status === "closed"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Support cases</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
            <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
            Hide closed
          </label>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={`flex items-center gap-1 ${primaryButtonClass}`}
          >
            <Plus size={13} />
            {showCreate ? "Close" : "New case"}
          </button>
        </div>
      </div>

      {showCreate && <CreateCaseForm containerId={containerId} onDone={() => setShowCreate(false)} />}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {cases && visible.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <LifeBuoy className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No cases to show.</p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {visible.map((c) => (
            <CaseRow key={c.id} crmCase={c} containerId={containerId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseRow({ crmCase, containerId }: { crmCase: CrmCase; containerId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "cases", containerId] });

  const advanceMutation = useMutation({
    mutationFn: (to: CaseStatus) => sdk.crm.advanceCase(crmCase.id, to),
    onSuccess: invalidate,
  });
  const reopenMutation = useMutation({
    mutationFn: () => sdk.crm.reopenCase(crmCase.id),
    onSuccess: invalidate,
  });

  const { data: comments } = useQuery({
    queryKey: ["crm", "case-comments", crmCase.id],
    queryFn: () => sdk.crm.listCaseComments(crmCase.id),
    enabled: expanded,
  });
  const commentMutation = useMutation({
    mutationFn: () => sdk.crm.addCaseComment(crmCase.id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "case-comments", crmCase.id] });
      setComment("");
    },
  });

  const canReopen = crmCase.status === "resolved" || crmCase.status === "closed";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown size={14} className="flex-none text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="flex-none text-neutral-400" />
          )}
          <span className="truncate text-sm font-medium">{crmCase.subject}</span>
          <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityClasses(crmCase.priority)}`}>
            {crmCase.priority}
          </span>
          <span className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {crmCase.status}
          </span>
        </button>
        <div className="flex flex-none items-center gap-2">
          {FORWARD_MOVES[crmCase.status].map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => advanceMutation.mutate(to)}
              disabled={advanceMutation.isPending}
              className={secondaryButtonClass}
            >
              → {to}
            </button>
          ))}
          {canReopen && (
            <button
              type="button"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
              className={secondaryButtonClass}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-l border-neutral-200 pl-4 dark:border-neutral-800">
          {crmCase.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{crmCase.description}</p>
          )}
          {comments?.map((c) => (
            <p key={c.id} className="text-xs text-neutral-600 dark:text-neutral-400">
              <span className="text-neutral-400 dark:text-neutral-600">
                {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
              </span>{" "}
              {c.text}
            </p>
          ))}
          {comments?.length === 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-600">No comments yet.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              className={`${inputClass} text-xs`}
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="button"
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
              className={`flex-none ${secondaryButtonClass}`}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function CreateCaseForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");

  const { data: accounts } = useQuery({
    queryKey: ["crm", "accounts", containerId],
    queryFn: () => sdk.crm.listAccountsForContainer(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.crm.createCase(accountId, {
        subject,
        description: description || undefined,
        priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "cases", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Account</label>
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select an account…</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Priority</label>
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as CasePriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Subject</label>
        <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Description</label>
        <textarea className={`${inputClass} min-h-[3rem]`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!accountId || !subject.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create case"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this case.</p>
        )}
      </div>
    </div>
  );
}
