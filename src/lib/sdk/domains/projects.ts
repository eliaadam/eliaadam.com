import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.projects`'s REST API
 * (`/api/projects/...`).
 *
 * NOTE on response envelopes: same `{"results": [...]}` convention as
 * `order.ts`/`logistics.ts` — list functions here manually pull
 * `.results` out rather than relying on `api.get<T>()`'s generic
 * `.data` unwrap, matching what the backend actually returns.
 *
 * OWNERSHIP MECHANICS — several write actions below are gated
 * backend-side by Ownership-OR-Authority (a project's own
 * owner_actor_id, or a task's own assignee_actor_id, alongside the
 * container-level role) rather than the role alone. A 403 from any
 * of these means neither condition was met.
 */

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "missed";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled";

export type Priority = "low" | "medium" | "high" | "critical";

export type DependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

export interface Project {
  id: string;
  container_id: string;
  name: string;
  description: string;
  goals: string;
  scope: string;
  owner_actor_id: string | null;
  stakeholder_actor_ids: string[];
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  due_date: string | null;
  status: MilestoneStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  milestone_id: string | null;
  parent_task_id: string | null;
  description: string;
  assignee_actor_id: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  checklist: ChecklistItem[];
  checklist_progress: { done: number; total: number };
  custom_fields: Record<string, unknown>;
  is_recurring: boolean;
  recurrence_rule: string | null;
  estimated_hours: number | null;
  created_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  created_at: string | null;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  actor_id: string;
  verb: string;
  subject_type: string;
  subject_id: string;
  detail: Record<string, unknown>;
  occurred_at: string | null;
}

// -- Projects ------------------------------------------------------------

export interface CreateProjectInput {
  name: string;
  description?: string;
  goals?: string;
  scope?: string;
  owner_actor_id?: string;
  stakeholder_actor_ids?: string[];
  priority?: Priority;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  budget_currency?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  goals?: string;
  scope?: string;
  owner_actor_id?: string;
  stakeholder_actor_ids?: string[];
  priority?: Priority;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  budget_currency?: string;
}

function createProject(
  containerId: string,
  input: CreateProjectInput,
): Promise<Project> {
  return api.post<Project>(
    `/api/projects/containers/${containerId}/projects/`,
    input,
  );
}

async function listProjectsForContainer(containerId: string): Promise<Project[]> {
  const result = await api.get<{ results: Project[] }>(
    `/api/projects/containers/${containerId}/projects/`,
  );
  return result.results;
}

function getProject(projectId: string): Promise<Project> {
  return api.get<Project>(`/api/projects/projects/${projectId}/`);
}

function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  return api.post<Project>(
    `/api/projects/projects/${projectId}/update/`,
    input,
  );
}

/** Ownership OR Authority — the project's own owner, or
 * project.manage. */
function startProject(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/start/`);
}

function putProjectOnHold(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/hold/`);
}

function resumeProject(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/resume/`);
}

function completeProject(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/complete/`);
}

function cancelProject(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/cancel/`);
}

function archiveProject(projectId: string): Promise<Project> {
  return api.post<Project>(`/api/projects/projects/${projectId}/archive/`);
}

// -- Milestones (folded into the "project" permission resource) --------

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  due_date?: string;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  due_date?: string;
}

function createMilestone(
  projectId: string,
  input: CreateMilestoneInput,
): Promise<Milestone> {
  return api.post<Milestone>(
    `/api/projects/projects/${projectId}/milestones/`,
    input,
  );
}

async function listMilestonesForProject(projectId: string): Promise<Milestone[]> {
  const result = await api.get<{ results: Milestone[] }>(
    `/api/projects/projects/${projectId}/milestones/`,
  );
  return result.results;
}

function getMilestone(milestoneId: string): Promise<Milestone> {
  return api.get<Milestone>(`/api/projects/milestones/${milestoneId}/`);
}

function updateMilestone(
  milestoneId: string,
  input: UpdateMilestoneInput,
): Promise<Milestone> {
  return api.post<Milestone>(
    `/api/projects/milestones/${milestoneId}/update/`,
    input,
  );
}

function startMilestone(milestoneId: string): Promise<Milestone> {
  return api.post<Milestone>(`/api/projects/milestones/${milestoneId}/start/`);
}

function completeMilestone(milestoneId: string): Promise<Milestone> {
  return api.post<Milestone>(
    `/api/projects/milestones/${milestoneId}/complete/`,
  );
}

function markMilestoneMissed(milestoneId: string): Promise<Milestone> {
  return api.post<Milestone>(`/api/projects/milestones/${milestoneId}/miss/`);
}

// -- Tasks ---------------------------------------------------------------

export interface CreateTaskInput {
  title: string;
  milestone_id?: string;
  parent_task_id?: string;
  description?: string;
  assignee_actor_id?: string;
  due_date?: string;
  priority?: Priority;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  is_recurring?: boolean;
  recurrence_rule?: string;
  estimated_hours?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  milestone_id?: string;
  due_date?: string;
  priority?: Priority;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  is_recurring?: boolean;
  recurrence_rule?: string;
  estimated_hours?: number;
}

function createTask(projectId: string, input: CreateTaskInput): Promise<Task> {
  return api.post<Task>(`/api/projects/projects/${projectId}/tasks/`, input);
}

async function listTasksForProject(projectId: string): Promise<Task[]> {
  const result = await api.get<{ results: Task[] }>(
    `/api/projects/projects/${projectId}/tasks/`,
  );
  return result.results;
}

/** "My tasks" — actor-scoped, no permission needed. */
async function listMyTasks(): Promise<Task[]> {
  const result = await api.get<{ results: Task[] }>("/api/projects/tasks/mine/");
  return result.results;
}

function getTask(taskId: string): Promise<Task> {
  return api.get<Task>(`/api/projects/tasks/${taskId}/`);
}

async function listSubtasks(parentTaskId: string): Promise<Task[]> {
  const result = await api.get<{ results: Task[] }>(
    `/api/projects/tasks/${parentTaskId}/subtasks/`,
  );
  return result.results;
}

/** Ownership OR Authority — the task's own assignee, or task.manage. */
function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/update/`, input);
}

/** assigneeActorId may be null — deliberate unassignment. */
function assignTask(taskId: string, assigneeActorId: string | null): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/assign/`, {
    assignee_actor_id: assigneeActorId,
  });
}

function startTask(taskId: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/start/`);
}

function submitTaskForReview(taskId: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/submit-for-review/`);
}

function completeTask(taskId: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/complete/`);
}

function reopenTask(taskId: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/reopen/`);
}

function cancelTask(taskId: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/cancel/`);
}

function addChecklistItem(taskId: string, text: string): Promise<Task> {
  return api.post<Task>(`/api/projects/tasks/${taskId}/checklist/`, { text });
}

function toggleChecklistItem(
  taskId: string,
  itemId: string,
  done: boolean,
): Promise<Task> {
  return api.post<Task>(
    `/api/projects/tasks/${taskId}/checklist/${itemId}/toggle/`,
    { done },
  );
}

function removeChecklistItem(taskId: string, itemId: string): Promise<Task> {
  return api.post<Task>(
    `/api/projects/tasks/${taskId}/checklist/${itemId}/remove/`,
  );
}

// -- Task dependencies (folded into the "task" permission resource,
// Authority-only — no assignee override) --------------------------------

function createDependency(
  taskId: string,
  dependsOnTaskId: string,
  dependencyType: DependencyType = "finish_to_start",
): Promise<TaskDependency> {
  return api.post<TaskDependency>(
    `/api/projects/tasks/${taskId}/dependencies/`,
    { depends_on_task_id: dependsOnTaskId, dependency_type: dependencyType },
  );
}

/** What this task itself depends on. */
async function listDependenciesForTask(taskId: string): Promise<TaskDependency[]> {
  const result = await api.get<{ results: TaskDependency[] }>(
    `/api/projects/tasks/${taskId}/dependencies/`,
  );
  return result.results;
}

/** What depends ON this task — the reverse direction. */
async function listDependents(taskId: string): Promise<TaskDependency[]> {
  const result = await api.get<{ results: TaskDependency[] }>(
    `/api/projects/tasks/${taskId}/dependents/`,
  );
  return result.results;
}

function removeDependency(
  dependencyId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/projects/dependencies/${dependencyId}/remove/`,
  );
}

// -- Activity feed ---------------------------------------------------

async function listProjectActivity(
  projectId: string,
  options?: { limit?: number; offset?: number },
): Promise<ActivityEntry[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  const qs = params.toString();
  const result = await api.get<{ results: ActivityEntry[] }>(
    `/api/projects/projects/${projectId}/activity/${qs ? `?${qs}` : ""}`,
  );
  return result.results;
}

// -- Risk / Issue / Blocker (folded into the "project" permission
// resource) ---------------------------------------------------------

export type RiskIssueType = "risk" | "issue" | "blocker";
export type RiskIssueStatus =
  | "open"
  | "mitigating"
  | "resolved"
  | "closed"
  | "escalated";
export type ImpactLevel = "low" | "medium" | "high" | "critical";
export type ProbabilityLevel = "low" | "medium" | "high";

export interface RiskIssue {
  id: string;
  project_id: string;
  type: RiskIssueType;
  title: string;
  description: string;
  status: RiskIssueStatus;
  impact: ImpactLevel;
  probability: ProbabilityLevel | null;
  mitigation_plan: string;
  linked_task_ids: string[];
  owner_actor_id: string | null;
  escalated_to_actor_id: string | null;
  created_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateRiskIssueInput {
  type: RiskIssueType;
  title: string;
  description?: string;
  impact?: ImpactLevel;
  probability?: ProbabilityLevel;
  mitigation_plan?: string;
  linked_task_ids?: string[];
  owner_actor_id?: string;
}

export interface UpdateRiskIssueInput {
  title?: string;
  description?: string;
  impact?: ImpactLevel;
  probability?: ProbabilityLevel;
  mitigation_plan?: string;
  linked_task_ids?: string[];
  owner_actor_id?: string;
}

function createRiskIssue(
  projectId: string,
  input: CreateRiskIssueInput,
): Promise<RiskIssue> {
  return api.post<RiskIssue>(
    `/api/projects/projects/${projectId}/risk-issues/`,
    input,
  );
}

async function listRiskIssuesForProject(projectId: string): Promise<RiskIssue[]> {
  const result = await api.get<{ results: RiskIssue[] }>(
    `/api/projects/projects/${projectId}/risk-issues/`,
  );
  return result.results;
}

function getRiskIssue(riskIssueId: string): Promise<RiskIssue> {
  return api.get<RiskIssue>(`/api/projects/risk-issues/${riskIssueId}/`);
}

/** Ownership OR Authority — this risk/issue's own owner, or
 * project.manage. */
function updateRiskIssue(
  riskIssueId: string,
  input: UpdateRiskIssueInput,
): Promise<RiskIssue> {
  return api.post<RiskIssue>(
    `/api/projects/risk-issues/${riskIssueId}/update/`,
    input,
  );
}

function startMitigatingRiskIssue(riskIssueId: string): Promise<RiskIssue> {
  return api.post<RiskIssue>(
    `/api/projects/risk-issues/${riskIssueId}/start-mitigating/`,
  );
}

function resolveRiskIssue(riskIssueId: string): Promise<RiskIssue> {
  return api.post<RiskIssue>(`/api/projects/risk-issues/${riskIssueId}/resolve/`);
}

function closeRiskIssue(riskIssueId: string): Promise<RiskIssue> {
  return api.post<RiskIssue>(`/api/projects/risk-issues/${riskIssueId}/close/`);
}

function reopenRiskIssue(riskIssueId: string): Promise<RiskIssue> {
  return api.post<RiskIssue>(`/api/projects/risk-issues/${riskIssueId}/reopen/`);
}

function escalateRiskIssue(
  riskIssueId: string,
  escalatedToActorId: string,
): Promise<RiskIssue> {
  return api.post<RiskIssue>(
    `/api/projects/risk-issues/${riskIssueId}/escalate/`,
    { escalated_to_actor_id: escalatedToActorId },
  );
}

// -- Time entries (folded into the "task" permission resource) ---------

export interface TimeEntry {
  id: string;
  task_id: string;
  project_id: string;
  actor_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  billable: boolean;
  note: string;
  created_at: string | null;
}

/** Ownership OR Authority — this task's own assignee, or task.manage. */
function startTimeEntry(
  taskId: string,
  input?: { billable?: boolean; note?: string },
): Promise<TimeEntry> {
  return api.post<TimeEntry>(
    `/api/projects/tasks/${taskId}/time-entries/start/`,
    input ?? {},
  );
}

/** The entry's own actor, or task.manage. */
function stopTimeEntry(timeEntryId: string): Promise<TimeEntry> {
  return api.post<TimeEntry>(`/api/projects/time-entries/${timeEntryId}/stop/`);
}

/** Direct manual logging — same Ownership-OR-Authority gate as
 * startTimeEntry. */
function logTimeEntry(
  taskId: string,
  input: { duration_minutes: number; billable?: boolean; note?: string },
): Promise<TimeEntry> {
  return api.post<TimeEntry>(
    `/api/projects/tasks/${taskId}/time-entries/log/`,
    input,
  );
}

function updateTimeEntry(
  timeEntryId: string,
  input: { billable?: boolean; note?: string },
): Promise<TimeEntry> {
  return api.post<TimeEntry>(
    `/api/projects/time-entries/${timeEntryId}/update/`,
    input,
  );
}

async function listTimeEntriesForTask(taskId: string): Promise<TimeEntry[]> {
  const result = await api.get<{ results: TimeEntry[] }>(
    `/api/projects/tasks/${taskId}/time-entries/`,
  );
  return result.results;
}

async function listTimeEntriesForProject(projectId: string): Promise<TimeEntry[]> {
  const result = await api.get<{ results: TimeEntry[] }>(
    `/api/projects/projects/${projectId}/time-entries/`,
  );
  return result.results;
}

/** Actor-scoped, no permission needed. */
async function listMyTimeEntries(projectId?: string): Promise<TimeEntry[]> {
  const qs = projectId ? `?project_id=${projectId}` : "";
  const result = await api.get<{ results: TimeEntry[] }>(
    `/api/projects/time-entries/mine/${qs}`,
  );
  return result.results;
}

// -- Expenses (folded into the "project" permission resource) --------

export type ExpenseStatus = "pending" | "approved" | "rejected" | "paid";

export interface Expense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  incurred_by_actor_id: string | null;
  status: ExpenseStatus;
  receipt_asset_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  currency: string;
  category?: string;
  incurred_by_actor_id?: string;
  receipt_asset_id?: string;
}

export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
  receipt_asset_id?: string;
}

/** Direct creation — starts "pending", needs its own approve()/
 * reject() call. See createExpenseRequest below for the
 * domains.requests-backed path, which lands directly as "approved". */
function createExpense(
  projectId: string,
  input: CreateExpenseInput,
): Promise<Expense> {
  return api.post<Expense>(
    `/api/projects/projects/${projectId}/expenses/`,
    input,
  );
}

async function listExpensesForProject(projectId: string): Promise<Expense[]> {
  const result = await api.get<{ results: Expense[] }>(
    `/api/projects/projects/${projectId}/expenses/`,
  );
  return result.results;
}

function getExpense(expenseId: string): Promise<Expense> {
  return api.get<Expense>(`/api/projects/expenses/${expenseId}/`);
}

function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<Expense> {
  return api.post<Expense>(`/api/projects/expenses/${expenseId}/update/`, input);
}

function approveExpense(expenseId: string): Promise<Expense> {
  return api.post<Expense>(`/api/projects/expenses/${expenseId}/approve/`);
}

function rejectExpense(expenseId: string): Promise<Expense> {
  return api.post<Expense>(`/api/projects/expenses/${expenseId}/reject/`);
}

function markExpensePaid(expenseId: string): Promise<Expense> {
  return api.post<Expense>(`/api/projects/expenses/${expenseId}/mark-paid/`);
}

// -- Expense requests — wraps the platform's own shared request/
// approval primitive (domains.requests), same shape as logistics's
// own carrier job requests. ------------------------------------------

export type ExpenseRequestStatus = "pending" | "approved" | "rejected";

export interface ExpenseRequest {
  id: string;
  request_type: string;
  requester_actor_id: string;
  target_type: string;
  target_id: string;
  status: ExpenseRequestStatus;
  payload: Record<string, unknown>;
  requested_at: string | null;
  decided_at: string | null;
  decided_by_actor_id: string | null;
  decision_reason: string | null;
}

/** Open to anyone who can view the project (project.view) — a
 * decision is separate from the ability to ask. */
function createExpenseRequest(
  projectId: string,
  payload: {
    description: string;
    amount: number;
    currency: string;
    category?: string;
    receipt_asset_id?: string;
  },
): Promise<ExpenseRequest> {
  return api.post<ExpenseRequest>(
    `/api/projects/projects/${projectId}/expense-requests/`,
    { payload },
  );
}

/** The project's own inbox of pending requests — project.manage. */
async function listExpenseRequestsForProject(
  projectId: string,
  status?: ExpenseRequestStatus,
): Promise<ExpenseRequest[]> {
  const qs = status ? `?status=${status}` : "";
  const result = await api.get<{ results: ExpenseRequest[] }>(
    `/api/projects/projects/${projectId}/expense-requests/${qs}`,
  );
  return result.results;
}

async function listMyExpenseRequests(
  status?: ExpenseRequestStatus,
): Promise<ExpenseRequest[]> {
  const qs = status ? `?status=${status}` : "";
  const result = await api.get<{ results: ExpenseRequest[] }>(
    `/api/projects/expense-requests/mine/${qs}`,
  );
  return result.results;
}

/** Triggers the actual, already-approved Expense creation atomically
 * with the decision itself — rolls back cleanly if it fails. Returns
 * both the updated request and the resulting Expense. */
function approveExpenseRequest(
  requestId: string,
): Promise<{ request: ExpenseRequest; expense: Expense }> {
  return api.post<{ request: ExpenseRequest; expense: Expense }>(
    `/api/projects/expense-requests/${requestId}/approve/`,
  );
}

function rejectExpenseRequest(
  requestId: string,
  reason?: string,
): Promise<ExpenseRequest> {
  return api.post<ExpenseRequest>(
    `/api/projects/expense-requests/${requestId}/reject/`,
    reason ? { reason } : undefined,
  );
}

// -- Dashboard / analytics — pure computed aggregation, no new
// stored data. ---------------------------------------------------------

export interface ProjectHealth {
  project_id: string;
  status: ProjectStatus;
  task_counts: Record<string, number>;
  task_completion: { done: number; total: number; percent: number };
  milestone_counts: Record<string, number>;
  budget: {
    planned_amount: number | null;
    currency: string | null;
    spent_amount: number;
    pending_amount: number;
  };
  logged_hours: number;
  risk_issue_counts: Record<string, Record<string, number>>;
}

export interface CriticalPath {
  project_id: string;
  path: string[];
  total_hours: number;
  error?: string;
}

function getProjectHealth(projectId: string): Promise<ProjectHealth> {
  return api.get<ProjectHealth>(`/api/projects/projects/${projectId}/health/`);
}

/** SIMPLIFICATION, stated plainly: every dependency_type is treated
 * uniformly as "predecessor must finish first" for this first pass —
 * see the backend's own DashboardApplicationService module docstring. */
function getCriticalPath(projectId: string): Promise<CriticalPath> {
  return api.get<CriticalPath>(
    `/api/projects/projects/${projectId}/critical-path/`,
  );
}


export const projects = {
  createProject,
  listProjectsForContainer,
  getProject,
  updateProject,
  startProject,
  putProjectOnHold,
  resumeProject,
  completeProject,
  cancelProject,
  archiveProject,
  createMilestone,
  listMilestonesForProject,
  getMilestone,
  updateMilestone,
  startMilestone,
  completeMilestone,
  markMilestoneMissed,
  createTask,
  listTasksForProject,
  listMyTasks,
  getTask,
  listSubtasks,
  updateTask,
  assignTask,
  startTask,
  submitTaskForReview,
  completeTask,
  reopenTask,
  cancelTask,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  createDependency,
  listDependenciesForTask,
  listDependents,
  removeDependency,
  listProjectActivity,
  createRiskIssue,
  listRiskIssuesForProject,
  getRiskIssue,
  updateRiskIssue,
  startMitigatingRiskIssue,
  resolveRiskIssue,
  closeRiskIssue,
  reopenRiskIssue,
  escalateRiskIssue,
  startTimeEntry,
  stopTimeEntry,
  logTimeEntry,
  updateTimeEntry,
  listTimeEntriesForTask,
  listTimeEntriesForProject,
  listMyTimeEntries,
  createExpense,
  listExpensesForProject,
  getExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  createExpenseRequest,
  listExpenseRequestsForProject,
  listMyExpenseRequests,
  approveExpenseRequest,
  rejectExpenseRequest,
  getProjectHealth,
  getCriticalPath,
};