import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Account, JournalEntry, JournalLineInput, JournalStatus } from "../../../lib/sdk/domains/finance";
import {
  badgeClass, cardClass, errorMessage, errorTextClass, flattenAccounts, formatDate, formatDateTime, formatMoney,
  inputClass, labelClass, primaryButtonClass, secondaryButtonClass, selectClass,
} from "./ui";

interface DraftLine {
  key: number;
  accountId: string;
  side: "debit" | "credit";
  amount: string; // major units in the input, e.g. "50.00" — converted to minor units on save
  memo: string;
}

let nextKey = 1;
function blankLine(): DraftLine {
  return { key: nextKey++, accountId: "", side: "debit", amount: "", memo: "" };
}

function toMinorUnits(major: string): number {
  const n = Number(major);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toLineInputs(lines: DraftLine[]): JournalLineInput[] {
  return lines
    .filter((l) => l.accountId && Number(l.amount) > 0)
    .map((l) => ({
      account_id: l.accountId,
      debit: l.side === "debit" ? toMinorUnits(l.amount) : 0,
      credit: l.side === "credit" ? toMinorUnits(l.amount) : 0,
      memo: l.memo,
    }));
}

export function JournalsTab({ containerId }: { containerId: string }) {
  const { data: accounts } = useQuery({ queryKey: ["finance", "accounts", containerId], queryFn: () => sdk.finance.listAccounts(containerId) });
  const { data: settings } = useQuery({ queryKey: ["finance", "settings", containerId], queryFn: () => sdk.finance.getSettings(containerId) });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JournalStatus | "">("");

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["finance", "journals", containerId, statusFilter],
    queryFn: () => sdk.finance.listJournals(containerId, { status: statusFilter || undefined, limit: 50 }),
  });

  const currency = settings?.base_currency ?? "";
  const accountsById = new Map((accounts ?? []).map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className={labelClass}>Status</label>
          <select className={`${selectClass} w-36`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as JournalStatus | "")}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
          </select>
        </div>
        <button type="button" onClick={() => setCreating((v) => !v)} className={primaryButtonClass}>
          {creating ? "Cancel" : "New journal"}
        </button>
      </div>

      {creating && accounts && (
        <JournalForm containerId={containerId} accounts={accounts} onDone={(id) => { setCreating(false); setSelectedId(id); }} />
      )}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load journals. Have the books been opened?")}</p>}

      {page && (
        <ul className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {page.entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="w-16 flex-none font-mono text-xs text-neutral-500 dark:text-neutral-500">
                  {e.entry_number ? `#${e.entry_number}` : "draft"}
                </span>
                <span className="w-24 flex-none text-xs text-neutral-500 dark:text-neutral-500">{formatDate(e.posting_date)}</span>
                <span className="min-w-0 flex-1 truncate">{e.description}</span>
                <span className="flex-none font-medium">{formatMoney(e.total_debit, e.currency)}</span>
                <span className={badgeClass}>{e.status === "posted" ? "Posted" : e.balanced ? "Draft" : "Unbalanced"}</span>
                {e.reverses_entry_id && <span className={badgeClass}>Reversal</span>}
                {e.reversed_by_entry_id && <span className={badgeClass}>Reversed</span>}
              </button>
              {selectedId === e.id && (
                <JournalDetail
                  containerId={containerId}
                  entryId={e.id}
                  accounts={accounts ?? []}
                  accountsById={accountsById}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </li>
          ))}
          {page.entries.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No journals yet.</li>}
        </ul>
      )}
      {page?.has_more && <p className="text-xs text-neutral-500 dark:text-neutral-500">More journals exist — narrow the filter to see them.</p>}
      {currency && <p className="text-xs text-neutral-400 dark:text-neutral-600">Amounts are in {currency}.</p>}
    </div>
  );
}

function LineEditor({
  lines, accounts, onChange,
}: { lines: DraftLine[]; accounts: Account[]; onChange: (lines: DraftLine[]) => void }) {
  const flat = flattenAccounts(accounts.filter((a) => a.is_active && !a.is_group));
  const update = (key: number, patch: Partial<DraftLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: number) => onChange(lines.filter((l) => l.key !== key));

  const totalDebit = lines.filter((l) => l.side === "debit").reduce((s, l) => s + toMinorUnits(l.amount), 0);
  const totalCredit = lines.filter((l) => l.side === "credit").reduce((s, l) => s + toMinorUnits(l.amount), 0);

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line) => (
        <div key={line.key} className="grid grid-cols-[minmax(0,2fr)_5rem_6rem_minmax(0,1.5fr)_auto] items-center gap-2">
          <select className={selectClass} value={line.accountId} onChange={(e) => update(line.key, { accountId: e.target.value })}>
            <option value="">Account…</option>
            {flat.map(({ account, depth }) => (
              <option key={account.id} value={account.id}>{"—".repeat(depth)} {account.code} · {account.name}</option>
            ))}
          </select>
          <select className={selectClass} value={line.side} onChange={(e) => update(line.key, { side: e.target.value as "debit" | "credit" })}>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={line.amount}
            onChange={(e) => update(line.key, { amount: e.target.value })}
          />
          <input className={inputClass} placeholder="Memo (optional)" value={line.memo} onChange={(e) => update(line.key, { memo: e.target.value })} />
          <button type="button" onClick={() => remove(line.key)} className={secondaryButtonClass}>
            Remove
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange([...lines, blankLine()])} className={secondaryButtonClass}>
          + Add line
        </button>
        <p className={`text-xs ${totalDebit === totalCredit && totalDebit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500 dark:text-neutral-500"}`}>
          Debit {(totalDebit / 100).toFixed(2)} · Credit {(totalCredit / 100).toFixed(2)}
          {totalDebit !== totalCredit && " · not balanced"}
        </p>
      </div>
    </div>
  );
}

function JournalForm({
  containerId, accounts, onDone,
}: { containerId: string; accounts: Account[]; onDone: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blankLine(), blankLine()]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance", "journals", containerId] });
  const saveDraft = useMutation({
    mutationFn: () => sdk.finance.createJournal(containerId, { posting_date: postingDate, description: description.trim(), lines: toLineInputs(lines) }),
    onSuccess: (e) => { refresh(); onDone(e.id); },
  });
  const saveAndPost = useMutation({
    mutationFn: () => sdk.finance.postNewJournal(containerId, { posting_date: postingDate, description: description.trim(), lines: toLineInputs(lines) }),
    onSuccess: (e) => { refresh(); onDone(e.id); },
  });

  const ready = description.trim().length > 0 && toLineInputs(lines).length >= 2;

  return (
    <div className={`p-4 ${cardClass}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Date</label>
          <input className={inputClass} type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Description</label>
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" />
        </div>
      </div>
      <div className="mt-3">
        <label className={`mb-1 block ${labelClass}`}>Lines</label>
        <LineEditor lines={lines} accounts={accounts} onChange={setLines} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => saveAndPost.mutate()} disabled={!ready || saveAndPost.isPending} className={primaryButtonClass}>
          {saveAndPost.isPending ? "Posting…" : "Save & post"}
        </button>
        <button type="button" onClick={() => saveDraft.mutate()} disabled={!ready || saveDraft.isPending} className={secondaryButtonClass}>
          {saveDraft.isPending ? "Saving…" : "Save as draft"}
        </button>
        {(saveDraft.isError || saveAndPost.isError) && (
          <p className={errorTextClass}>{errorMessage(saveDraft.error ?? saveAndPost.error, "Couldn't save that journal.")}</p>
        )}
      </div>
    </div>
  );
}

function JournalDetail({
  containerId, entryId, accounts, accountsById, onClose,
}: {
  containerId: string; entryId: string; accounts: Account[]; accountsById: Map<string, Account>; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: entry, isLoading, error } = useQuery({
    queryKey: ["finance", "journal", containerId, entryId],
    queryFn: () => sdk.finance.getJournal(containerId, entryId),
  });
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reversing, setReversing] = useState(false);
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["finance", "journal", containerId, entryId] });
    queryClient.invalidateQueries({ queryKey: ["finance", "journals", containerId] });
  };

  const startEdit = (e: JournalEntry) => {
    setLines((e.lines ?? []).map((l) => ({
      key: nextKey++, accountId: l.account_id, side: l.debit > 0 ? "debit" : "credit",
      amount: ((l.debit || l.credit) / 100).toFixed(2), memo: l.memo,
    })));
    setEditing(true);
  };

  const saveEdit = useMutation({
    mutationFn: () => sdk.finance.updateJournal(containerId, entryId, { lines: toLineInputs(lines) }),
    onSuccess: () => { refresh(); setEditing(false); },
  });
  const post = useMutation({ mutationFn: () => sdk.finance.postJournal(containerId, entryId), onSuccess: refresh });
  const discard = useMutation({ mutationFn: () => sdk.finance.discardJournal(containerId, entryId), onSuccess: () => { refresh(); onClose(); } });
  const reverse = useMutation({
    mutationFn: () => sdk.finance.reverseJournal(containerId, entryId, { posting_date: reversalDate }),
    onSuccess: refresh,
  });

  if (isLoading) return <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">Loading…</div>;
  if (error) return <div className={`border-t border-neutral-200 px-4 py-3 dark:border-neutral-800 ${errorTextClass}`}>{errorMessage(error, "Couldn't load this journal.")}</div>;
  if (!entry) return null;

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
      {editing ? (
        <>
          <LineEditor lines={lines} accounts={accounts} onChange={setLines} />
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => saveEdit.mutate()} disabled={toLineInputs(lines).length < 2 || saveEdit.isPending} className={primaryButtonClass}>
              {saveEdit.isPending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>Cancel</button>
            {saveEdit.isError && <p className={errorTextClass}>{errorMessage(saveEdit.error, "Couldn't save that.")}</p>}
          </div>
        </>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            {(entry.lines ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-1.5">
                <span>
                  {accountsById.get(l.account_id)?.code ?? l.account_code} · {accountsById.get(l.account_id)?.name ?? l.account_name}
                  {l.memo && <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-500">{l.memo}</span>}
                </span>
                <span className="font-mono text-xs">
                  {l.debit > 0 ? formatMoney(l.debit, entry.currency) : ""}
                  {l.credit > 0 ? `(${formatMoney(l.credit, entry.currency)})` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
            Created {formatDateTime(entry.created_at)}
            {entry.posted_at && ` · Posted ${formatDateTime(entry.posted_at)}`}
            {entry.source_type && ` · from ${entry.source_type}`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {entry.status === "draft" && (
              <>
                <button type="button" onClick={() => post.mutate()} disabled={post.isPending} className={primaryButtonClass}>
                  {post.isPending ? "Posting…" : "Post"}
                </button>
                <button type="button" onClick={() => startEdit(entry)} className={secondaryButtonClass}>Edit</button>
                <button type="button" onClick={() => discard.mutate()} disabled={discard.isPending} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
                  Discard
                </button>
              </>
            )}
            {entry.status === "posted" && !entry.reversed_by_entry_id && (
              <>
                {reversing ? (
                  <>
                    <input className={`${inputClass} w-40`} type="date" value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} />
                    <button type="button" onClick={() => reverse.mutate()} disabled={reverse.isPending} className={primaryButtonClass}>
                      {reverse.isPending ? "Reversing…" : "Confirm reversal"}
                    </button>
                    <button type="button" onClick={() => setReversing(false)} className={secondaryButtonClass}>Cancel</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setReversing(true)} className={secondaryButtonClass}>Reverse</button>
                )}
              </>
            )}
            {(post.isError || discard.isError || reverse.isError) && (
              <p className={errorTextClass}>{errorMessage(post.error ?? discard.error ?? reverse.error, "That action was refused.")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
