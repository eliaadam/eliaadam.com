import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.finance`'s REST API (`/api/finance/...`).
 *
 * Money is always an integer in the smallest unit of the books' currency
 * (e.g. cents), never a float. Every route needs a `core.finance.*`
 * permission in the container named by the URL — there is no ownership
 * mode, the books belong to the organisation. Errors come back as
 * `{"error": "...", "code": "..."}`; `code` is a stable machine key
 * (e.g. `"period_closed"`, `"missing_mappings"`) for anything that wants
 * to branch on the failure kind rather than parse the message.
 */

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalSide = "debit" | "credit";
export type JournalStatus = "draft" | "posted";
export type PeriodStatus = "open" | "closed";
export type PostingAttemptStatus = "posted" | "skipped" | "parked" | "dismissed";
export type ReportParamKind = "date" | "account" | "text";
export type ReportColumnKind = "text" | "money" | "date" | "number";

export interface BooksSettings {
  books_open: boolean;
  base_currency: string | null;
  opened_at: string | null;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_side: NormalSide;
  parent_id: string | null;
  description: string;
  is_active: boolean;
  /** Has sub-accounts — group accounts can't be posted to directly. */
  is_group: boolean;
  /** Account roles currently mapped to this account, e.g. ["generic.cash"]. */
  roles: string[];
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string | null;
  description?: string;
}

/** Partial: send only the fields you want to change. */
export type UpdateAccountInput = Partial<{
  name: string;
  description: string;
  code: string;
  type: AccountType;
  parent_id: string | null;
}>;

export interface AccountRole {
  code: string;
  label: string;
  description: string;
  account_types: AccountType[];
  account: { id: string; code: string; name: string } | null;
}

export interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closed_at: string | null;
  closed_by_actor_id: string | null;
}

export interface JournalLine {
  id: string;
  position: number;
  account_id: string;
  account_code: string | null;
  account_name: string | null;
  debit: number;
  credit: number;
  memo: string;
}

export interface JournalEntry {
  id: string;
  entry_number: number | null;
  status: JournalStatus;
  posting_date: string;
  currency: string;
  description: string;
  total_debit: number;
  total_credit: number;
  balanced: boolean;
  line_count: number;
  source_type: string | null;
  source_id: string | null;
  reverses_entry_id: string | null;
  reversed_by_entry_id: string | null;
  created_by_actor_id: string | null;
  posted_by_actor_id: string | null;
  created_at: string | null;
  posted_at: string | null;
  /** Present on a single-entry fetch; omitted from list rows. */
  lines?: JournalLine[];
}

export interface JournalLineInput {
  account_id: string;
  debit?: number;
  credit?: number;
  memo?: string;
}

export interface CreateJournalInput {
  posting_date: string;
  description: string;
  lines?: JournalLineInput[];
  source_type?: string;
  source_id?: string;
}

export type UpdateJournalInput = Partial<{
  posting_date: string;
  description: string;
  lines: JournalLineInput[];
}>;

export interface JournalPage {
  entries: JournalEntry[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface JournalListFilters {
  status?: JournalStatus;
  start?: string;
  end?: string;
  account_id?: string;
  source_type?: string;
  source_id?: string;
  limit?: number;
  offset?: number;
}

export interface ReportParam {
  name: string;
  kind: ReportParamKind;
  label: string;
  required: boolean;
}

export interface ReportDefinition {
  code: string;
  label: string;
  description: string;
  params: ReportParam[];
}

export interface ReportColumn {
  key: string;
  label: string;
  kind: ReportColumnKind;
}

export interface ReportResult {
  report: ReportDefinition;
  columns: ReportColumn[];
  /** Shape depends on the report — see FINANCE-M1-WIRING.md. Render generically off `columns`. */
  rows: Record<string, unknown>[];
  totals: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface PostingAttempt {
  id: string;
  rule_key: string;
  message_id: string;
  message_name: string;
  status: PostingAttemptStatus;
  reason: string;
  detail: Record<string, unknown>;
  attempts: number;
  entry_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

function qsOf<T extends object>(params: T): string {
  return qs(params as unknown as Record<string, string | number | undefined>);
}

// -- settings -----------------------------------------------------------------------------------

function getSettings(containerId: string): Promise<BooksSettings> {
  return api.get<BooksSettings>(`/api/finance/containers/${containerId}/settings/`);
}

/** Once per container; the base currency can never change afterwards. */
function openBooks(containerId: string, baseCurrency: string): Promise<BooksSettings> {
  return api.post<BooksSettings>(`/api/finance/containers/${containerId}/settings/open/`, { base_currency: baseCurrency });
}

// -- accounts -------------------------------------------------------------------------------------

async function listAccounts(containerId: string): Promise<Account[]> {
  const r = await api.get<{ accounts: Account[] }>(`/api/finance/containers/${containerId}/accounts/`);
  return r.accounts;
}

function createAccount(containerId: string, input: CreateAccountInput): Promise<Account> {
  return api.post<Account>(`/api/finance/containers/${containerId}/accounts/create/`, input);
}

function getAccount(containerId: string, accountId: string): Promise<Account> {
  return api.get<Account>(`/api/finance/containers/${containerId}/accounts/${accountId}/`);
}

function updateAccount(containerId: string, accountId: string, changes: UpdateAccountInput): Promise<Account> {
  return api.post<Account>(`/api/finance/containers/${containerId}/accounts/${accountId}/update/`, changes);
}

/** A deactivated account can't be posted to or mapped to a role; it stays for history — never deleted. */
function activateAccount(containerId: string, accountId: string): Promise<Account> {
  return api.post<Account>(`/api/finance/containers/${containerId}/accounts/${accountId}/activate/`);
}

/** 409 if the account is still mapped to a role — unmap it first. */
function deactivateAccount(containerId: string, accountId: string): Promise<Account> {
  return api.post<Account>(`/api/finance/containers/${containerId}/accounts/${accountId}/deactivate/`);
}

// -- account role mappings -------------------------------------------------------------------------------

/** All roles Finance knows (built in and pack-added), each with the account
 * currently mapped in this container, if any. */
async function listRoles(containerId: string): Promise<AccountRole[]> {
  const r = await api.get<{ roles: AccountRole[] }>(`/api/finance/containers/${containerId}/roles/`);
  return r.roles;
}

/** 409 if the account's type doesn't fit the role, or the account is a group. */
function mapRole(containerId: string, role: string, accountId: string): Promise<AccountRole> {
  return api.post<AccountRole>(`/api/finance/containers/${containerId}/roles/${encodeURIComponent(role)}/map/`, { account_id: accountId });
}

function unmapRole(containerId: string, role: string): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(`/api/finance/containers/${containerId}/roles/${encodeURIComponent(role)}/unmap/`);
}

// -- fiscal periods ---------------------------------------------------------------------------------------

async function listPeriods(containerId: string): Promise<Period[]> {
  const r = await api.get<{ periods: Period[] }>(`/api/finance/containers/${containerId}/periods/`);
  return r.periods;
}

/** 409 on overlap with an existing period. */
function createPeriod(containerId: string, input: { name: string; start_date: string; end_date: string }): Promise<Period> {
  return api.post<Period>(`/api/finance/containers/${containerId}/periods/create/`, input);
}

/** 409 if any draft journal is dated inside the period — post or discard it first. */
function closePeriod(containerId: string, periodId: string): Promise<Period> {
  return api.post<Period>(`/api/finance/containers/${containerId}/periods/${periodId}/close/`);
}

function reopenPeriod(containerId: string, periodId: string): Promise<Period> {
  return api.post<Period>(`/api/finance/containers/${containerId}/periods/${periodId}/reopen/`);
}

// -- journals -----------------------------------------------------------------------------------------------

/** Newest first. Rows omit `lines` — fetch a journal individually for those. */
function listJournals(containerId: string, filters: JournalListFilters = {}): Promise<JournalPage> {
  return api.get<JournalPage>(`/api/finance/containers/${containerId}/journals/${qsOf(filters)}`);
}

/** Saved as a draft — may be unbalanced. Post separately once it balances. */
function createJournal(containerId: string, input: CreateJournalInput): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/api/finance/containers/${containerId}/journals/create/`, input);
}

/** Create and post in one atomic step (needs post rights, not just create). 400 if it doesn't balance. */
function postNewJournal(containerId: string, input: CreateJournalInput): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/api/finance/containers/${containerId}/journals/post-new/`, input);
}

function getJournal(containerId: string, entryId: string): Promise<JournalEntry> {
  return api.get<JournalEntry>(`/api/finance/containers/${containerId}/journals/${entryId}/`);
}

/** Draft only — a posted journal is immutable (reverse it instead). */
function updateJournal(containerId: string, entryId: string, changes: UpdateJournalInput): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/api/finance/containers/${containerId}/journals/${entryId}/update/`, changes);
}

function discardJournal(containerId: string, entryId: string): Promise<{ discarded: boolean }> {
  return api.post<{ discarded: boolean }>(`/api/finance/containers/${containerId}/journals/${entryId}/discard/`);
}

/** 400 (`unbalanced_journal`) if debits ≠ credits; 409 (`period_closed`) if the date falls in a closed period. */
function postJournal(containerId: string, entryId: string): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/api/finance/containers/${containerId}/journals/${entryId}/post/`);
}

/** Mirror-image entry, dated today unless `posting_date` is given. 409 if already reversed. */
function reverseJournal(containerId: string, entryId: string, options: { posting_date?: string; description?: string } = {}): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/api/finance/containers/${containerId}/journals/${entryId}/reverse/`, options);
}

// -- reports --------------------------------------------------------------------------------------------------

async function listReports(containerId: string): Promise<ReportDefinition[]> {
  const r = await api.get<{ reports: ReportDefinition[] }>(`/api/finance/containers/${containerId}/reports/`);
  return r.reports;
}

/** `params` keys must match the report's own `ReportDefinition.params`. */
function runReport(containerId: string, code: string, params: Record<string, string> = {}): Promise<ReportResult> {
  return api.get<ReportResult>(`/api/finance/containers/${containerId}/reports/${encodeURIComponent(code)}/${qsOf(params)}`);
}

// -- the accountant's queue of automatic postings that need attention -------------------------------------------------------------

async function listPostingQueue(containerId: string): Promise<PostingAttempt[]> {
  const r = await api.get<{ attempts: PostingAttempt[] }>(`/api/finance/containers/${containerId}/posting-queue/`);
  return r.attempts;
}

/** Re-runs the rule on the original message — after fixing whatever parked it (e.g. mapping a role). */
function replayPosting(containerId: string, attemptId: string): Promise<PostingAttempt> {
  return api.post<PostingAttempt>(`/api/finance/containers/${containerId}/posting-queue/${attemptId}/replay/`);
}

function dismissPosting(containerId: string, attemptId: string, note = ""): Promise<PostingAttempt> {
  return api.post<PostingAttempt>(`/api/finance/containers/${containerId}/posting-queue/${attemptId}/dismiss/`, { note });
}

export const finance = {
  getSettings, openBooks,
  listAccounts, createAccount, getAccount, updateAccount, activateAccount, deactivateAccount,
  listRoles, mapRole, unmapRole,
  listPeriods, createPeriod, closePeriod, reopenPeriod,
  listJournals, createJournal, postNewJournal, getJournal, updateJournal, discardJournal, postJournal, reverseJournal,
  listReports, runReport,
  listPostingQueue, replayPosting, dismissPosting,
};
