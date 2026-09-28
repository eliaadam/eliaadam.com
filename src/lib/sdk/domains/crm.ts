import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.crm`'s REST API (`/api/crm/...`).
 * Same `{"results": [...]}` envelope convention as every other domain
 * SDK in this codebase.
 *
 * OWNERSHIP — several write actions below are gated backend-side by
 * Ownership-OR-Authority: a record's own owner (Account/Lead/
 * Opportunity/Activity `owner_actor_id`) or a Case's assignee
 * (`assigned_to_actor_id`) may act on it without the matching
 * `.manage` permission. A 403 means neither condition was met.
 *
 * Quotes, campaigns, and territory routing are intentionally absent —
 * deferred on the backend, see its domain/entities.py docstring.
 */

// -- Account / Contact -------------------------------------------------

export type AccountStatus = "prospect" | "customer" | "churned";

export interface Account {
  id: string;
  container_id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  billing_address: string;
  owner_actor_id: string | null;
  status: AccountStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface Contact {
  id: string;
  container_id: string;
  full_name: string;
  account_id: string | null;
  actor_id: string | null;
  email: string;
  phone: string;
  title: string;
  owner_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateAccountInput {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  billing_address?: string;
  owner_actor_id?: string;
}

export interface UpdateAccountInput {
  name?: string;
  industry?: string;
  website?: string;
  phone?: string;
  billing_address?: string;
  owner_actor_id?: string;
}

export interface CreateContactInput {
  full_name: string;
  actor_id?: string;
  email?: string;
  phone?: string;
  title?: string;
  owner_actor_id?: string;
}

export interface UpdateContactInput {
  full_name?: string;
  account_id?: string;
  email?: string;
  phone?: string;
  title?: string;
  owner_actor_id?: string;
}

function createAccount(containerId: string, input: CreateAccountInput): Promise<Account> {
  return api.post<Account>(`/api/crm/containers/${containerId}/accounts/`, input);
}

async function listAccountsForContainer(containerId: string): Promise<Account[]> {
  const r = await api.get<{ results: Account[] }>(`/api/crm/containers/${containerId}/accounts/`);
  return r.results;
}

/** Actor-scoped — accounts the caller owns. */
async function listMyAccounts(): Promise<Account[]> {
  const r = await api.get<{ results: Account[] }>("/api/crm/accounts/mine/");
  return r.results;
}

/** The account's own owner, or account.view. */
function getAccount(accountId: string): Promise<Account> {
  return api.get<Account>(`/api/crm/accounts/${accountId}/`);
}

/** The account's own owner, or account.manage. */
function updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account> {
  return api.post<Account>(`/api/crm/accounts/${accountId}/update/`, input);
}

function markAccountCustomer(accountId: string): Promise<Account> {
  return api.post<Account>(`/api/crm/accounts/${accountId}/mark-customer/`);
}

function markAccountChurned(accountId: string): Promise<Account> {
  return api.post<Account>(`/api/crm/accounts/${accountId}/mark-churned/`);
}

/** Contact creation rides the account's own ownership/permission —
 * account_id is taken from the path, not the body. */
function createContact(accountId: string, input: CreateContactInput): Promise<Contact> {
  return api.post<Contact>(`/api/crm/accounts/${accountId}/contacts/`, input);
}

async function listContactsForAccount(accountId: string): Promise<Contact[]> {
  const r = await api.get<{ results: Contact[] }>(`/api/crm/accounts/${accountId}/contacts/`);
  return r.results;
}

function getContact(contactId: string): Promise<Contact> {
  return api.get<Contact>(`/api/crm/contacts/${contactId}/`);
}

function updateContact(contactId: string, input: UpdateContactInput): Promise<Contact> {
  return api.post<Contact>(`/api/crm/contacts/${contactId}/update/`, input);
}

// -- Lead ------------------------------------------------------------------

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";

export interface Lead {
  id: string;
  container_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  source: string;
  status: LeadStatus;
  score: number | null;
  owner_actor_id: string | null;
  converted_account_id: string | null;
  converted_contact_id: string | null;
  converted_opportunity_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateLeadInput {
  full_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  source?: string;
  owner_actor_id?: string;
}

export interface UpdateLeadInput {
  full_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  score?: number;
  owner_actor_id?: string;
}

export interface ConvertLeadResult {
  lead: Lead;
  account: Account;
  contact: Contact;
  opportunity: Opportunity;
}

function createLead(containerId: string, input: CreateLeadInput): Promise<Lead> {
  return api.post<Lead>(`/api/crm/containers/${containerId}/leads/`, input);
}

async function listLeadsForContainer(containerId: string): Promise<Lead[]> {
  const r = await api.get<{ results: Lead[] }>(`/api/crm/containers/${containerId}/leads/`);
  return r.results;
}

/** Actor-scoped — leads the caller owns. */
async function listMyLeads(): Promise<Lead[]> {
  const r = await api.get<{ results: Lead[] }>("/api/crm/leads/mine/");
  return r.results;
}

function getLead(leadId: string): Promise<Lead> {
  return api.get<Lead>(`/api/crm/leads/${leadId}/`);
}

function updateLead(leadId: string, input: UpdateLeadInput): Promise<Lead> {
  return api.post<Lead>(`/api/crm/leads/${leadId}/update/`, input);
}

/** Legal moves: new → contacted → qualified | unqualified. "converted"
 * is unreachable here — use convertLead. */
function advanceLead(leadId: string, toStatus: LeadStatus): Promise<Lead> {
  return api.post<Lead>(`/api/crm/leads/${leadId}/advance/`, { to_status: toStatus });
}

/** One atomic operation: creates an Account, a Contact linked to it,
 * and an open Opportunity, then stamps the lead converted. The lead
 * must be contacted or qualified first; a second call 409s. */
function convertLead(leadId: string, opportunityName?: string): Promise<ConvertLeadResult> {
  return api.post<ConvertLeadResult>(
    `/api/crm/leads/${leadId}/convert/`,
    opportunityName ? { opportunity_name: opportunityName } : {},
  );
}

// -- Opportunity ---------------------------------------------------------

export type OpportunityStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface Opportunity {
  id: string;
  container_id: string;
  account_id: string;
  name: string;
  stage: OpportunityStage;
  amount: number | null;
  currency: string | null;
  probability: number | null;
  primary_contact_id: string | null;
  expected_close_date: string | null;
  owner_actor_id: string | null;
  lost_reason: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateOpportunityInput {
  name: string;
  amount?: number;
  currency?: string;
  probability?: number;
  primary_contact_id?: string;
  expected_close_date?: string;
  owner_actor_id?: string;
}

export interface UpdateOpportunityInput {
  name?: string;
  amount?: number;
  currency?: string;
  probability?: number;
  primary_contact_id?: string;
  expected_close_date?: string;
  owner_actor_id?: string;
}

function createOpportunity(accountId: string, input: CreateOpportunityInput): Promise<Opportunity> {
  return api.post<Opportunity>(`/api/crm/accounts/${accountId}/opportunities/`, input);
}

async function listOpportunitiesForAccount(accountId: string): Promise<Opportunity[]> {
  const r = await api.get<{ results: Opportunity[] }>(`/api/crm/accounts/${accountId}/opportunities/`);
  return r.results;
}

/** Every open (non-closed) opportunity in the container — what a
 * pipeline board renders. */
async function listPipeline(containerId: string): Promise<Opportunity[]> {
  const r = await api.get<{ results: Opportunity[] }>(
    `/api/crm/containers/${containerId}/opportunities/pipeline/`,
  );
  return r.results;
}

/** Actor-scoped — the caller's own opportunities. */
async function listMyOpportunities(): Promise<Opportunity[]> {
  const r = await api.get<{ results: Opportunity[] }>("/api/crm/opportunities/mine/");
  return r.results;
}

function getOpportunity(opportunityId: string): Promise<Opportunity> {
  return api.get<Opportunity>(`/api/crm/opportunities/${opportunityId}/`);
}

function updateOpportunity(
  opportunityId: string,
  input: UpdateOpportunityInput,
): Promise<Opportunity> {
  return api.post<Opportunity>(`/api/crm/opportunities/${opportunityId}/update/`, input);
}

/** Forward moves only (prospecting → qualification → proposal →
 * negotiation → closed_won). Use markOpportunityLost for closed_lost.
 * Probability follows the new stage's default unless it was manually
 * overridden. */
function advanceOpportunity(
  opportunityId: string,
  toStage: OpportunityStage,
): Promise<Opportunity> {
  return api.post<Opportunity>(`/api/crm/opportunities/${opportunityId}/advance/`, {
    to_stage: toStage,
  });
}

function markOpportunityLost(opportunityId: string, reason?: string): Promise<Opportunity> {
  return api.post<Opportunity>(
    `/api/crm/opportunities/${opportunityId}/mark-lost/`,
    reason ? { reason } : {},
  );
}

// -- Activity --------------------------------------------------------------

export type ActivityType = "call" | "meeting" | "note" | "task";
export type ActivityRelatedType = "account" | "contact" | "opportunity" | "lead";

export interface Activity {
  id: string;
  container_id: string;
  activity_type: ActivityType;
  related_to_type: ActivityRelatedType;
  related_to_id: string;
  owner_actor_id: string;
  subject: string;
  notes: string;
  due_at: string | null;
  completed_at: string | null;
  outcome: string;
  conversation_id: string | null;
  created_at: string | null;
}

export interface CreateActivityInput {
  activity_type: ActivityType;
  subject?: string;
  notes?: string;
  due_at?: string;
  /** Optional link to a real Communication conversation, when the
   * interaction happened through the platform's own messaging. */
  conversation_id?: string;
}

/** Logging an activity rides the related record's container
 * permission (activity.manage); the caller becomes its owner. */
function createActivity(
  relatedToType: ActivityRelatedType,
  relatedToId: string,
  input: CreateActivityInput,
): Promise<Activity> {
  return api.post<Activity>(`/api/crm/${relatedToType}s/${relatedToId}/activities/`, input);
}

async function listActivitiesForRecord(
  relatedToType: ActivityRelatedType,
  relatedToId: string,
): Promise<Activity[]> {
  const r = await api.get<{ results: Activity[] }>(
    `/api/crm/${relatedToType}s/${relatedToId}/activities/`,
  );
  return r.results;
}

/** Actor-scoped — the caller's own activities; onlyOpen limits to
 * not-yet-completed ones (an open-tasks view). */
async function listMyActivities(onlyOpen?: boolean): Promise<Activity[]> {
  const qs = onlyOpen ? "?only_open=true" : "";
  const r = await api.get<{ results: Activity[] }>(`/api/crm/activities/mine/${qs}`);
  return r.results;
}

/** The activity's own owner, or activity.manage. */
function completeActivity(activityId: string, outcome?: string): Promise<Activity> {
  return api.post<Activity>(
    `/api/crm/activities/${activityId}/complete/`,
    outcome ? { outcome } : {},
  );
}

// -- Case (+ CaseComment) -----------------------------------------------

export type CasePriority = "low" | "medium" | "high" | "urgent";
export type CaseStatus = "new" | "open" | "pending" | "resolved" | "closed";

export interface CrmCase {
  id: string;
  container_id: string;
  account_id: string;
  subject: string;
  contact_id: string | null;
  description: string;
  priority: CasePriority;
  status: CaseStatus;
  assigned_to_actor_id: string | null;
  sla_due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseComment {
  id: string;
  case_id: string;
  author_actor_id: string;
  text: string;
  created_at: string | null;
}

export interface CreateCaseInput {
  subject: string;
  contact_id?: string;
  description?: string;
  priority?: CasePriority;
  assigned_to_actor_id?: string;
  sla_due_at?: string;
}

export interface UpdateCaseInput {
  subject?: string;
  description?: string;
  priority?: CasePriority;
  assigned_to_actor_id?: string;
  sla_due_at?: string;
}

/** Cases are created under their own account. */
function createCase(accountId: string, input: CreateCaseInput): Promise<CrmCase> {
  return api.post<CrmCase>(`/api/crm/accounts/${accountId}/cases/`, input);
}

async function listCasesForAccount(accountId: string): Promise<CrmCase[]> {
  const r = await api.get<{ results: CrmCase[] }>(`/api/crm/accounts/${accountId}/cases/`);
  return r.results;
}

/** Container-wide queue, for triage/assignment. */
async function listCasesForContainer(containerId: string): Promise<CrmCase[]> {
  const r = await api.get<{ results: CrmCase[] }>(`/api/crm/containers/${containerId}/cases/`);
  return r.results;
}

/** Actor-scoped — cases assigned to the caller. */
async function listMyCases(): Promise<CrmCase[]> {
  const r = await api.get<{ results: CrmCase[] }>("/api/crm/cases/mine/");
  return r.results;
}

function getCase(caseId: string): Promise<CrmCase> {
  return api.get<CrmCase>(`/api/crm/cases/${caseId}/`);
}

function updateCase(caseId: string, input: UpdateCaseInput): Promise<CrmCase> {
  return api.post<CrmCase>(`/api/crm/cases/${caseId}/update/`, input);
}

/** Legal moves: new → open → pending ⇄ open → resolved → closed. */
function advanceCase(caseId: string, toStatus: CaseStatus): Promise<CrmCase> {
  return api.post<CrmCase>(`/api/crm/cases/${caseId}/advance/`, { to_status: toStatus });
}

/** Only from resolved or closed; case.manage only (no assignee
 * override). */
function reopenCase(caseId: string): Promise<CrmCase> {
  return api.post<CrmCase>(`/api/crm/cases/${caseId}/reopen/`);
}

function addCaseComment(caseId: string, text: string): Promise<CaseComment> {
  return api.post<CaseComment>(`/api/crm/cases/${caseId}/comments/`, { text });
}

async function listCaseComments(caseId: string): Promise<CaseComment[]> {
  const r = await api.get<{ results: CaseComment[] }>(`/api/crm/cases/${caseId}/comments/`);
  return r.results;
}

export const crm = {
  createAccount, listAccountsForContainer, listMyAccounts, getAccount, updateAccount,
  markAccountCustomer, markAccountChurned,
  createContact, listContactsForAccount, getContact, updateContact,
  createLead, listLeadsForContainer, listMyLeads, getLead, updateLead, advanceLead, convertLead,
  createOpportunity, listOpportunitiesForAccount, listPipeline, listMyOpportunities,
  getOpportunity, updateOpportunity, advanceOpportunity, markOpportunityLost,
  createActivity, listActivitiesForRecord, listMyActivities, completeActivity,
  createCase, listCasesForAccount, listCasesForContainer, listMyCases, getCase,
  updateCase, advanceCase, reopenCase, addCaseComment, listCaseComments,
};
