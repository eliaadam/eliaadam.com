import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.hr`'s REST API (`/api/hr/...`).
 * Same `{"results": [...]}` envelope convention as every other domain
 * SDK in this codebase.
 *
 * OWNERSHIP — several write actions below are gated backend-side by
 * Ownership-OR-Authority (an employee's own actor_id for self-service,
 * or a manager via Employment.manager_actor_id for their direct
 * reports) rather than the matching .manage permission alone. A 403
 * means neither condition was met.
 */

// -- Job / Position --------------------------------------------------

export type JobStatus = "active" | "archived";
export type PositionStatus = "vacant" | "filled" | "frozen" | "closed";
export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Job {
  id: string;
  container_id: string;
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  competencies: string[];
  job_family: string;
  level: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_currency: string | null;
  status: JobStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface Position {
  id: string;
  container_id: string;
  job_id: string;
  department_container_id: string;
  reports_to_position_id: string | null;
  cost_center_code: string;
  status: PositionStatus;
  headcount: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PositionSkillRequirement {
  id: string;
  position_id: string;
  skill_id: string;
  required_proficiency_level: ProficiencyLevel;
}

export interface CreateJobInput {
  title: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  competencies?: string[];
  job_family?: string;
  level?: string;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_currency?: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  competencies?: string[];
  job_family?: string;
  level?: string;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_currency?: string;
}

function createJob(containerId: string, input: CreateJobInput): Promise<Job> {
  return api.post<Job>(`/api/hr/containers/${containerId}/jobs/`, input);
}

async function listJobsForContainer(containerId: string): Promise<Job[]> {
  const r = await api.get<{ results: Job[] }>(`/api/hr/containers/${containerId}/jobs/`);
  return r.results;
}

function getJob(jobId: string): Promise<Job> {
  return api.get<Job>(`/api/hr/jobs/${jobId}/`);
}

function updateJob(jobId: string, input: UpdateJobInput): Promise<Job> {
  return api.post<Job>(`/api/hr/jobs/${jobId}/update/`, input);
}

function archiveJob(jobId: string): Promise<Job> {
  return api.post<Job>(`/api/hr/jobs/${jobId}/archive/`);
}

function reactivateJob(jobId: string): Promise<Job> {
  return api.post<Job>(`/api/hr/jobs/${jobId}/reactivate/`);
}

export interface CreatePositionInput {
  job_id: string;
  department_container_id: string;
  reports_to_position_id?: string;
  cost_center_code?: string;
  headcount?: number;
}

export interface UpdatePositionInput {
  reports_to_position_id?: string;
  cost_center_code?: string;
  headcount?: number;
}

function createPosition(containerId: string, input: CreatePositionInput): Promise<Position> {
  return api.post<Position>(`/api/hr/containers/${containerId}/positions/`, input);
}

/** Currently vacant-only — see the backend's own PositionRepository,
 * which has no general list_for_container. */
async function listVacantPositions(containerId: string): Promise<Position[]> {
  const r = await api.get<{ results: Position[] }>(`/api/hr/containers/${containerId}/positions/`);
  return r.results;
}

function getPosition(positionId: string): Promise<Position> {
  return api.get<Position>(`/api/hr/positions/${positionId}/`);
}

function updatePosition(positionId: string, input: UpdatePositionInput): Promise<Position> {
  return api.post<Position>(`/api/hr/positions/${positionId}/update/`, input);
}

function fillPosition(positionId: string): Promise<Position> {
  return api.post<Position>(`/api/hr/positions/${positionId}/fill/`);
}

function vacatePosition(positionId: string): Promise<Position> {
  return api.post<Position>(`/api/hr/positions/${positionId}/vacate/`);
}

function freezePosition(positionId: string): Promise<Position> {
  return api.post<Position>(`/api/hr/positions/${positionId}/freeze/`);
}

function closePosition(positionId: string): Promise<Position> {
  return api.post<Position>(`/api/hr/positions/${positionId}/close/`);
}

function addPositionSkillRequirement(
  positionId: string,
  skillId: string,
  requiredProficiencyLevel: ProficiencyLevel,
): Promise<PositionSkillRequirement> {
  return api.post<PositionSkillRequirement>(
    `/api/hr/positions/${positionId}/skill-requirements/`,
    { skill_id: skillId, required_proficiency_level: requiredProficiencyLevel },
  );
}

async function listPositionSkillRequirements(positionId: string): Promise<PositionSkillRequirement[]> {
  const r = await api.get<{ results: PositionSkillRequirement[] }>(
    `/api/hr/positions/${positionId}/skill-requirements/`,
  );
  return r.results;
}

function removePositionSkillRequirement(
  positionId: string,
  requirementId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/hr/positions/${positionId}/skill-requirements/${requirementId}/remove/`,
  );
}

// -- Employee / Employment / Contract / History -----------------------

export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type WorkingArrangement = "onsite" | "remote" | "hybrid";
export type EmploymentStatus = "active" | "suspended" | "terminated";
export type ContractType = "permanent" | "fixed_term" | "probation" | "internship";
export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export interface Employee {
  id: string;
  container_id: string;
  actor_id: string;
  employee_number: string;
  personal_email: string;
  phone: string;
  date_of_birth: string | null;
  national_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  status: EmployeeStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface Employment {
  id: string;
  employee_id: string;
  position_id: string;
  manager_actor_id: string | null;
  employment_type: EmploymentType;
  working_arrangement: WorkingArrangement;
  start_date: string | null;
  end_date: string | null;
  status: EmploymentStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface Contract {
  id: string;
  employment_id: string;
  contract_type: ContractType;
  start_date: string | null;
  end_date: string | null;
  probation_end_date: string | null;
  terms: string;
  status: ContractStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmploymentHistoryEntry {
  id: string;
  employment_id: string;
  event_type: string;
  effective_date: string | null;
  previous_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  note: string;
  recorded_by_actor_id: string | null;
  recorded_at: string | null;
}

export interface CreateEmployeeInput {
  actor_id: string;
  employee_number: string;
  personal_email?: string;
  phone?: string;
  date_of_birth?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UpdateEmployeeInput {
  personal_email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

function createEmployee(containerId: string, input: CreateEmployeeInput): Promise<Employee> {
  return api.post<Employee>(`/api/hr/containers/${containerId}/employees/`, input);
}

async function listEmployeesForContainer(containerId: string): Promise<Employee[]> {
  const r = await api.get<{ results: Employee[] }>(`/api/hr/containers/${containerId}/employees/`);
  return r.results;
}

/** Actor-scoped — the caller's own employee profile. */
function getMyEmployeeProfile(containerId?: string): Promise<Employee> {
  const qs = containerId ? `?container_id=${containerId}` : "";
  return api.get<Employee>(`/api/hr/employees/me/${qs}`);
}

function getEmployee(employeeId: string): Promise<Employee> {
  return api.get<Employee>(`/api/hr/employees/${employeeId}/`);
}

/** Ownership OR Authority — the employee's own actor, or employee.manage. */
function updateEmployee(employeeId: string, input: UpdateEmployeeInput): Promise<Employee> {
  return api.post<Employee>(`/api/hr/employees/${employeeId}/update/`, input);
}

export interface CreateEmploymentInput {
  position_id: string;
  manager_actor_id?: string;
  employment_type?: EmploymentType;
  working_arrangement?: WorkingArrangement;
  start_date?: string;
}

function createEmployment(employeeId: string, input: CreateEmploymentInput): Promise<Employment> {
  return api.post<Employment>(`/api/hr/employees/${employeeId}/employments/`, input);
}

async function listEmploymentsForEmployee(employeeId: string): Promise<Employment[]> {
  const r = await api.get<{ results: Employment[] }>(`/api/hr/employees/${employeeId}/employments/`);
  return r.results;
}

/** Self, direct manager, or employee.view. */
function getEmployment(employmentId: string): Promise<Employment> {
  return api.get<Employment>(`/api/hr/employments/${employmentId}/`);
}

/** Actor-scoped — the caller's own direct reports. */
async function listMyDirectReports(): Promise<Employment[]> {
  const r = await api.get<{ results: Employment[] }>("/api/hr/employments/my-reports/");
  return r.results;
}

function transferEmployment(
  employmentId: string,
  input: { position_id: string; manager_actor_id?: string; effective_date?: string },
): Promise<Employment> {
  return api.post<Employment>(`/api/hr/employments/${employmentId}/transfer/`, input);
}

function suspendEmployment(employmentId: string): Promise<Employment> {
  return api.post<Employment>(`/api/hr/employments/${employmentId}/suspend/`);
}

function reactivateEmployment(employmentId: string): Promise<Employment> {
  return api.post<Employment>(`/api/hr/employments/${employmentId}/reactivate/`);
}

function terminateEmployment(employmentId: string, endDate: string): Promise<Employment> {
  return api.post<Employment>(`/api/hr/employments/${employmentId}/terminate/`, { end_date: endDate });
}

async function listEmploymentHistory(employmentId: string): Promise<EmploymentHistoryEntry[]> {
  const r = await api.get<{ results: EmploymentHistoryEntry[] }>(`/api/hr/employments/${employmentId}/history/`);
  return r.results;
}

export interface CreateContractInput {
  contract_type: ContractType;
  start_date: string;
  end_date?: string;
  probation_end_date?: string;
  terms?: string;
}

function createContract(employmentId: string, input: CreateContractInput): Promise<Contract> {
  return api.post<Contract>(`/api/hr/employments/${employmentId}/contracts/`, input);
}

async function listContractsForEmployment(employmentId: string): Promise<Contract[]> {
  const r = await api.get<{ results: Contract[] }>(`/api/hr/employments/${employmentId}/contracts/`);
  return r.results;
}

function activateContract(contractId: string): Promise<Contract> {
  return api.post<Contract>(`/api/hr/contracts/${contractId}/activate/`);
}

function expireContract(contractId: string): Promise<Contract> {
  return api.post<Contract>(`/api/hr/contracts/${contractId}/expire/`);
}

function terminateContract(contractId: string): Promise<Contract> {
  return api.post<Contract>(`/api/hr/contracts/${contractId}/terminate/`);
}

// -- Skills -------------------------------------------------------------

export interface Skill {
  id: string;
  container_id: string;
  name: string;
  category: string;
}

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  certified: boolean;
  certified_at: string | null;
}

function createSkill(containerId: string, name: string, category?: string): Promise<Skill> {
  return api.post<Skill>(`/api/hr/containers/${containerId}/skills/`, { name, category });
}

async function listSkillsForContainer(containerId: string): Promise<Skill[]> {
  const r = await api.get<{ results: Skill[] }>(`/api/hr/containers/${containerId}/skills/`);
  return r.results;
}

function addEmployeeSkill(
  employeeId: string,
  input: {
    skill_id: string;
    proficiency_level: ProficiencyLevel;
    certified?: boolean;
    certified_at?: string;
  },
): Promise<EmployeeSkill> {
  return api.post<EmployeeSkill>(`/api/hr/employees/${employeeId}/skills/`, input);
}

async function listEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
  const r = await api.get<{ results: EmployeeSkill[] }>(`/api/hr/employees/${employeeId}/skills/`);
  return r.results;
}

// -- Recruitment ---------------------------------------------------------

export type JobOpeningStatus = "open" | "on_hold" | "closed" | "filled";
export type ApplicationStatus =
  | "applied" | "screening" | "interviewing" | "assessment"
  | "offer" | "hired" | "rejected" | "withdrawn";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";
export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "rescinded";

export interface JobOpening {
  id: string;
  container_id: string;
  position_id: string;
  title: string;
  description: string;
  hiring_manager_actor_id: string | null;
  status: JobOpeningStatus;
  opened_at: string | null;
  closed_at: string | null;
}

export interface Candidate {
  id: string;
  container_id: string;
  full_name: string;
  email: string;
  phone: string;
  source: string;
  resume_asset_id: string | null;
  created_at: string | null;
}

export interface Application {
  id: string;
  job_opening_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  updated_at: string | null;
}

export interface Interview {
  id: string;
  application_id: string;
  interviewer_actor_id: string;
  scheduled_at: string | null;
  completed_at: string | null;
  feedback: string;
  rating: number | null;
  status: InterviewStatus;
}

export interface Offer {
  id: string;
  application_id: string;
  position_id: string;
  salary_amount: number;
  salary_currency: string;
  start_date: string | null;
  status: OfferStatus;
  sent_at: string | null;
  decided_at: string | null;
}

export interface CreateJobOpeningInput {
  position_id: string;
  title: string;
  description?: string;
  hiring_manager_actor_id?: string;
}

function createJobOpening(containerId: string, input: CreateJobOpeningInput): Promise<JobOpening> {
  return api.post<JobOpening>(`/api/hr/containers/${containerId}/job-openings/`, input);
}

async function listJobOpeningsForContainer(containerId: string): Promise<JobOpening[]> {
  const r = await api.get<{ results: JobOpening[] }>(`/api/hr/containers/${containerId}/job-openings/`);
  return r.results;
}

/** Public browse — no permission needed. */
async function listOpenJobOpenings(containerId: string): Promise<JobOpening[]> {
  const r = await api.get<{ results: JobOpening[] }>(`/api/hr/containers/${containerId}/job-openings/open/`);
  return r.results;
}

function getJobOpening(jobOpeningId: string): Promise<JobOpening> {
  return api.get<JobOpening>(`/api/hr/job-openings/${jobOpeningId}/`);
}

function putJobOpeningOnHold(jobOpeningId: string): Promise<JobOpening> {
  return api.post<JobOpening>(`/api/hr/job-openings/${jobOpeningId}/hold/`);
}

function reopenJobOpening(jobOpeningId: string): Promise<JobOpening> {
  return api.post<JobOpening>(`/api/hr/job-openings/${jobOpeningId}/reopen/`);
}

function closeJobOpening(jobOpeningId: string): Promise<JobOpening> {
  return api.post<JobOpening>(`/api/hr/job-openings/${jobOpeningId}/close/`);
}

function fillJobOpening(jobOpeningId: string): Promise<JobOpening> {
  return api.post<JobOpening>(`/api/hr/job-openings/${jobOpeningId}/fill/`);
}

/** Open to any authenticated actor — applying doesn't require
 * recruitment.manage. */
function createCandidate(
  containerId: string,
  input: { full_name: string; email: string; phone?: string; source?: string; resume_asset_id?: string },
): Promise<Candidate> {
  return api.post<Candidate>(`/api/hr/containers/${containerId}/candidates/`, input);
}

function createApplication(jobOpeningId: string, candidateId: string): Promise<Application> {
  return api.post<Application>(`/api/hr/job-openings/${jobOpeningId}/applications/`, {
    candidate_id: candidateId,
  });
}

async function listApplicationsForOpening(jobOpeningId: string): Promise<Application[]> {
  const r = await api.get<{ results: Application[] }>(`/api/hr/job-openings/${jobOpeningId}/applications/`);
  return r.results;
}

function getApplication(applicationId: string): Promise<Application> {
  return api.get<Application>(`/api/hr/applications/${applicationId}/`);
}

function advanceApplication(applicationId: string, toStatus: ApplicationStatus): Promise<Application> {
  return api.post<Application>(`/api/hr/applications/${applicationId}/advance/`, { to_status: toStatus });
}

function withdrawApplication(applicationId: string): Promise<Application> {
  return api.post<Application>(`/api/hr/applications/${applicationId}/withdraw/`);
}

function scheduleInterview(
  applicationId: string,
  input: { interviewer_actor_id: string; scheduled_at?: string },
): Promise<Interview> {
  return api.post<Interview>(`/api/hr/applications/${applicationId}/interviews/`, input);
}

async function listInterviewsForApplication(applicationId: string): Promise<Interview[]> {
  const r = await api.get<{ results: Interview[] }>(`/api/hr/applications/${applicationId}/interviews/`);
  return r.results;
}

/** Actor-scoped — the caller's own upcoming interviews as interviewer. */
async function listMyInterviews(): Promise<Interview[]> {
  const r = await api.get<{ results: Interview[] }>("/api/hr/interviews/mine/");
  return r.results;
}

/** The interview's own interviewer, or recruitment.manage. */
function rescheduleInterview(interviewId: string, scheduledAt: string): Promise<Interview> {
  return api.post<Interview>(`/api/hr/interviews/${interviewId}/reschedule/`, { scheduled_at: scheduledAt });
}

function completeInterview(
  interviewId: string,
  input: { feedback?: string; rating?: number },
): Promise<Interview> {
  return api.post<Interview>(`/api/hr/interviews/${interviewId}/complete/`, input);
}

function cancelInterview(interviewId: string): Promise<Interview> {
  return api.post<Interview>(`/api/hr/interviews/${interviewId}/cancel/`);
}

export interface CreateOfferInput {
  position_id: string;
  salary_amount: number;
  salary_currency: string;
  start_date?: string;
}

function createOffer(applicationId: string, input: CreateOfferInput): Promise<Offer> {
  return api.post<Offer>(`/api/hr/applications/${applicationId}/offers/`, input);
}

async function listOffersForApplication(applicationId: string): Promise<Offer[]> {
  const r = await api.get<{ results: Offer[] }>(`/api/hr/applications/${applicationId}/offers/`);
  return r.results;
}

function sendOffer(offerId: string): Promise<Offer> {
  return api.post<Offer>(`/api/hr/offers/${offerId}/send/`);
}

function acceptOffer(offerId: string): Promise<Offer> {
  return api.post<Offer>(`/api/hr/offers/${offerId}/accept/`);
}

function declineOffer(offerId: string): Promise<Offer> {
  return api.post<Offer>(`/api/hr/offers/${offerId}/decline/`);
}

function rescindOffer(offerId: string): Promise<Offer> {
  return api.post<Offer>(`/api/hr/offers/${offerId}/rescind/`);
}

// -- Attendance & Time ----------------------------------------------

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Shift {
  id: string;
  container_id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
}

export interface ScheduleAssignment {
  id: string;
  employment_id: string;
  shift_id: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface AttendanceRecord {
  id: string;
  employment_id: string;
  date: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status: AttendanceStatus;
  overtime_hours: number | null;
  overtime_approved: boolean;
  overtime_approved_by_actor_id: string | null;
  note: string;
}

export interface Timesheet {
  id: string;
  employment_id: string;
  period_start: string | null;
  period_end: string | null;
  total_hours: number | null;
  status: TimesheetStatus;
  submitted_at: string | null;
  approved_by_actor_id: string | null;
  approved_at: string | null;
}

function createShift(
  containerId: string,
  input: { name: string; start_time: string; end_time: string; days_of_week?: string[] },
): Promise<Shift> {
  return api.post<Shift>(`/api/hr/containers/${containerId}/shifts/`, input);
}

async function listShiftsForContainer(containerId: string): Promise<Shift[]> {
  const r = await api.get<{ results: Shift[] }>(`/api/hr/containers/${containerId}/shifts/`);
  return r.results;
}

function assignSchedule(
  shiftId: string,
  input: { employment_id: string; effective_from: string; effective_to?: string },
): Promise<ScheduleAssignment> {
  return api.post<ScheduleAssignment>(`/api/hr/shifts/${shiftId}/assign/`, input);
}

async function listScheduleForEmployment(employmentId: string): Promise<ScheduleAssignment[]> {
  const r = await api.get<{ results: ScheduleAssignment[] }>(`/api/hr/employments/${employmentId}/schedule/`);
  return r.results;
}

/** Self, manager, or attendance.manage. Idempotent per (employment, date). */
function checkIn(employmentId: string, date?: string): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(`/api/hr/employments/${employmentId}/check-in/`, { date });
}

function checkOut(recordId: string): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(`/api/hr/attendance/${recordId}/check-out/`);
}

function markAttendanceStatus(recordId: string, status: AttendanceStatus): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(`/api/hr/attendance/${recordId}/status/`, { status });
}

function logOvertime(recordId: string, hours: number): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(`/api/hr/attendance/${recordId}/overtime/`, { hours });
}

function approveOvertime(recordId: string): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(`/api/hr/attendance/${recordId}/overtime/approve/`);
}

async function listAttendanceForEmployment(
  employmentId: string,
  options?: { start?: string; end?: string },
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (options?.start) params.set("start", options.start);
  if (options?.end) params.set("end", options.end);
  const qs = params.toString();
  const r = await api.get<{ results: AttendanceRecord[] }>(
    `/api/hr/employments/${employmentId}/attendance/${qs ? `?${qs}` : ""}`,
  );
  return r.results;
}

function createTimesheet(
  employmentId: string,
  input: { period_start: string; period_end: string; total_hours?: number },
): Promise<Timesheet> {
  return api.post<Timesheet>(`/api/hr/employments/${employmentId}/timesheets/`, input);
}

async function listTimesheetsForEmployment(employmentId: string): Promise<Timesheet[]> {
  const r = await api.get<{ results: Timesheet[] }>(`/api/hr/employments/${employmentId}/timesheets/`);
  return r.results;
}

/** A manager's own approval inbox. */
async function listTimesheetsPendingForMe(): Promise<Timesheet[]> {
  const r = await api.get<{ results: Timesheet[] }>("/api/hr/timesheets/pending-approval/");
  return r.results;
}

/** The timesheet's own actor only. */
function submitTimesheet(timesheetId: string): Promise<Timesheet> {
  return api.post<Timesheet>(`/api/hr/timesheets/${timesheetId}/submit/`);
}

/** The employment's own manager, or HR. */
function approveTimesheet(timesheetId: string): Promise<Timesheet> {
  return api.post<Timesheet>(`/api/hr/timesheets/${timesheetId}/approve/`);
}

function rejectTimesheet(timesheetId: string): Promise<Timesheet> {
  return api.post<Timesheet>(`/api/hr/timesheets/${timesheetId}/reject/`);
}

// -- Leave -------------------------------------------------------------

export type LeaveRecordStatus = "approved" | "cancelled";
export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export interface LeaveType {
  id: string;
  container_id: string;
  name: string;
  paid: boolean;
  default_annual_days: number | null;
}

export interface LeaveBalance {
  id: string;
  employment_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRecord {
  id: string;
  employment_id: string;
  leave_type_id: string;
  start_date: string | null;
  end_date: string | null;
  days: number;
  status: LeaveRecordStatus;
  approved_by_actor_id: string | null;
  created_at: string | null;
}

export interface LeaveRequest {
  id: string;
  request_type: string;
  requester_actor_id: string;
  target_type: string;
  target_id: string;
  status: LeaveRequestStatus;
  payload: Record<string, unknown>;
  requested_at: string | null;
  decided_at: string | null;
  decided_by_actor_id: string | null;
  decision_reason: string | null;
}

function createLeaveType(
  containerId: string,
  input: { name: string; paid?: boolean; default_annual_days?: number },
): Promise<LeaveType> {
  return api.post<LeaveType>(`/api/hr/containers/${containerId}/leave-types/`, input);
}

async function listLeaveTypesForContainer(containerId: string): Promise<LeaveType[]> {
  const r = await api.get<{ results: LeaveType[] }>(`/api/hr/containers/${containerId}/leave-types/`);
  return r.results;
}

function createLeaveBalance(
  employmentId: string,
  input: { leave_type_id: string; year: number; allocated_days: number },
): Promise<LeaveBalance> {
  return api.post<LeaveBalance>(`/api/hr/employments/${employmentId}/leave-balances/`, input);
}

async function listLeaveBalances(employmentId: string): Promise<LeaveBalance[]> {
  const r = await api.get<{ results: LeaveBalance[] }>(`/api/hr/employments/${employmentId}/leave-balances/`);
  return r.results;
}

/** Self, manager, or leave.view. */
async function listLeaveRecords(employmentId: string): Promise<LeaveRecord[]> {
  const r = await api.get<{ results: LeaveRecord[] }>(`/api/hr/employments/${employmentId}/leave-records/`);
  return r.results;
}

/** Direct creation — checks and deducts the employee's own remaining
 * balance; leave.manage only (no self-service path — use
 * createLeaveRequest for that). */
function createLeaveRecord(
  employmentId: string,
  input: { leave_type_id: string; start_date: string; end_date: string; days: number },
): Promise<LeaveRecord> {
  return api.post<LeaveRecord>(`/api/hr/employments/${employmentId}/leave-records/create/`, input);
}

function cancelLeaveRecord(leaveRecordId: string): Promise<LeaveRecord> {
  return api.post<LeaveRecord>(`/api/hr/leave-records/${leaveRecordId}/cancel/`);
}

/** Open to self, or anyone who can view the employment. */
function createLeaveRequest(
  employmentId: string,
  payload: { leave_type_id: string; start_date: string; end_date: string; days: number },
): Promise<LeaveRequest> {
  return api.post<LeaveRequest>(`/api/hr/employments/${employmentId}/leave-requests/`, { payload });
}

/** The employment's own inbox — leave.manage or its manager. */
async function listLeaveRequestsForEmployment(
  employmentId: string,
  status?: LeaveRequestStatus,
): Promise<LeaveRequest[]> {
  const qs = status ? `?status=${status}` : "";
  const r = await api.get<{ results: LeaveRequest[] }>(
    `/api/hr/employments/${employmentId}/leave-requests/${qs}`,
  );
  return r.results;
}

async function listMyLeaveRequests(status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
  const qs = status ? `?status=${status}` : "";
  const r = await api.get<{ results: LeaveRequest[] }>(`/api/hr/leave-requests/mine/${qs}`);
  return r.results;
}

/** Triggers the actual LeaveRecord creation atomically with the
 * approval — including the balance check. */
function approveLeaveRequest(
  requestId: string,
): Promise<{ request: LeaveRequest; record: LeaveRecord }> {
  return api.post<{ request: LeaveRequest; record: LeaveRecord }>(`/api/hr/leave-requests/${requestId}/approve/`);
}

function rejectLeaveRequest(requestId: string, reason?: string): Promise<LeaveRequest> {
  return api.post<LeaveRequest>(`/api/hr/leave-requests/${requestId}/reject/`, reason ? { reason } : undefined);
}

// -- Compensation / Benefits -------------------------------------------

export type BenefitType = "health" | "retirement" | "housing" | "transport" | "meal" | "other";
export type BenefitEnrollmentStatus = "active" | "cancelled";

export interface AllowanceLine {
  id: string;
  name: string;
  amount: number;
  recurring: boolean;
}

export interface CompensationRecord {
  id: string;
  employment_id: string;
  base_salary_amount: number;
  base_salary_currency: string;
  pay_frequency: string;
  allowances: AllowanceLine[];
  bonus_amount: number | null;
  bonus_note: string;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string | null;
}

export interface BenefitPlan {
  id: string;
  container_id: string;
  name: string;
  type: BenefitType;
  description: string;
  provider: string;
  cost_amount: number | null;
  cost_currency: string | null;
  employer_contribution_percent: number | null;
}

export interface BenefitEnrollment {
  id: string;
  employment_id: string;
  benefit_plan_id: string;
  dependent_names: string[];
  status: BenefitEnrollmentStatus;
  enrolled_at: string | null;
}

export interface CreateCompensationRecordInput {
  base_salary_amount: number;
  base_salary_currency: string;
  effective_from: string;
  pay_frequency?: string;
  allowances?: { name: string; amount: number; recurring?: boolean }[];
  bonus_amount?: number;
  bonus_note?: string;
}

/** Self (view only), or compensation.view/manage. */
async function listCompensationHistory(employmentId: string): Promise<CompensationRecord[]> {
  const r = await api.get<{ results: CompensationRecord[] }>(`/api/hr/employments/${employmentId}/compensation/`);
  return r.results;
}

function createCompensationRecord(
  employmentId: string,
  input: CreateCompensationRecordInput,
): Promise<CompensationRecord> {
  return api.post<CompensationRecord>(`/api/hr/employments/${employmentId}/compensation/`, input);
}

async function getCurrentCompensation(employmentId: string): Promise<CompensationRecord | null> {
  const r = await api.get<Partial<CompensationRecord>>(`/api/hr/employments/${employmentId}/compensation/current/`);
  return r.id ? (r as CompensationRecord) : null;
}

function createBenefitPlan(
  containerId: string,
  input: {
    name: string;
    type: BenefitType;
    description?: string;
    provider?: string;
    cost_amount?: number;
    cost_currency?: string;
    employer_contribution_percent?: number;
  },
): Promise<BenefitPlan> {
  return api.post<BenefitPlan>(`/api/hr/containers/${containerId}/benefit-plans/`, input);
}

async function listBenefitPlansForContainer(containerId: string): Promise<BenefitPlan[]> {
  const r = await api.get<{ results: BenefitPlan[] }>(`/api/hr/containers/${containerId}/benefit-plans/`);
  return r.results;
}

/** Self, or compensation.view/manage. */
async function listBenefitEnrollments(employmentId: string): Promise<BenefitEnrollment[]> {
  const r = await api.get<{ results: BenefitEnrollment[] }>(`/api/hr/employments/${employmentId}/benefit-enrollments/`);
  return r.results;
}

function enrollBenefit(
  employmentId: string,
  input: { benefit_plan_id: string; dependent_names?: string[] },
): Promise<BenefitEnrollment> {
  return api.post<BenefitEnrollment>(`/api/hr/employments/${employmentId}/benefit-enrollments/`, input);
}

/** Self, or compensation.manage. */
function cancelBenefitEnrollment(enrollmentId: string): Promise<BenefitEnrollment> {
  return api.post<BenefitEnrollment>(`/api/hr/benefit-enrollments/${enrollmentId}/cancel/`);
}

// -- Performance ---------------------------------------------------------

export type GoalOwnerType = "organization" | "department" | "team" | "employee";
export type GoalStatus = "not_started" | "in_progress" | "completed" | "missed";
export type ReviewType = "self" | "manager" | "peer" | "360";
export type ReviewStatus = "draft" | "submitted" | "finalized";
export type FeedbackType = "strength" | "improvement" | "general";
export type PipStatus = "active" | "completed" | "failed";

export interface Goal {
  id: string;
  container_id: string;
  owner_type: GoalOwnerType;
  owner_id: string;
  title: string;
  description: string;
  parent_goal_id: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface PerformanceReview {
  id: string;
  employment_id: string;
  reviewer_actor_id: string;
  review_period_start: string | null;
  review_period_end: string | null;
  review_type: ReviewType;
  overall_rating: number | null;
  status: ReviewStatus;
  submitted_at: string | null;
}

export interface ReviewFeedback {
  id: string;
  review_id: string;
  feedback_type: FeedbackType;
  text: string;
  competency_id: string | null;
  created_at: string | null;
}

export interface PerformanceImprovementPlan {
  id: string;
  employment_id: string;
  reason: string;
  start_date: string | null;
  end_date: string | null;
  review_id: string | null;
  goals: string[];
  status: PipStatus;
  created_at: string | null;
}

export interface CreateGoalInput {
  owner_type: GoalOwnerType;
  owner_id: string;
  title: string;
  description?: string;
  parent_goal_id?: string;
  target_date?: string;
}

function createGoal(containerId: string, input: CreateGoalInput): Promise<Goal> {
  return api.post<Goal>(`/api/hr/containers/${containerId}/goals/`, input);
}

async function listGoalsForOwner(
  containerId: string,
  ownerType: GoalOwnerType,
  ownerId: string,
): Promise<Goal[]> {
  const r = await api.get<{ results: Goal[] }>(
    `/api/hr/containers/${containerId}/goals/?owner_type=${ownerType}&owner_id=${ownerId}`,
  );
  return r.results;
}

async function listGoalChildren(goalId: string): Promise<Goal[]> {
  const r = await api.get<{ results: Goal[] }>(`/api/hr/goals/${goalId}/children/`);
  return r.results;
}

function updateGoal(goalId: string, input: { title?: string; description?: string; target_date?: string }): Promise<Goal> {
  return api.post<Goal>(`/api/hr/goals/${goalId}/update/`, input);
}

function startGoal(goalId: string): Promise<Goal> {
  return api.post<Goal>(`/api/hr/goals/${goalId}/start/`);
}

function completeGoal(goalId: string): Promise<Goal> {
  return api.post<Goal>(`/api/hr/goals/${goalId}/complete/`);
}

function markGoalMissed(goalId: string): Promise<Goal> {
  return api.post<Goal>(`/api/hr/goals/${goalId}/miss/`);
}

export interface CreatePerformanceReviewInput {
  reviewer_actor_id: string;
  review_period_start: string;
  review_period_end: string;
  review_type?: ReviewType;
}

/** Self, manager, or performance.view (for GET); performance.manage
 * for POST. */
async function listReviewsForEmployment(employmentId: string): Promise<PerformanceReview[]> {
  const r = await api.get<{ results: PerformanceReview[] }>(`/api/hr/employments/${employmentId}/performance-reviews/`);
  return r.results;
}

function createPerformanceReview(
  employmentId: string,
  input: CreatePerformanceReviewInput,
): Promise<PerformanceReview> {
  return api.post<PerformanceReview>(`/api/hr/employments/${employmentId}/performance-reviews/`, input);
}

/** Actor-scoped — reviews the caller owes as reviewer. */
async function listMyReviewsToGive(): Promise<PerformanceReview[]> {
  const r = await api.get<{ results: PerformanceReview[] }>("/api/hr/performance-reviews/mine-to-give/");
  return r.results;
}

/** The review's own reviewer, or performance.manage. */
function submitPerformanceReview(reviewId: string): Promise<PerformanceReview> {
  return api.post<PerformanceReview>(`/api/hr/performance-reviews/${reviewId}/submit/`);
}

function finalizePerformanceReview(reviewId: string, overallRating?: number): Promise<PerformanceReview> {
  return api.post<PerformanceReview>(`/api/hr/performance-reviews/${reviewId}/finalize/`, {
    overall_rating: overallRating,
  });
}

function addReviewFeedback(
  reviewId: string,
  input: { feedback_type: FeedbackType; text: string; competency_id?: string },
): Promise<ReviewFeedback> {
  return api.post<ReviewFeedback>(`/api/hr/performance-reviews/${reviewId}/feedback/`, input);
}

async function listReviewFeedback(reviewId: string): Promise<ReviewFeedback[]> {
  const r = await api.get<{ results: ReviewFeedback[] }>(`/api/hr/performance-reviews/${reviewId}/feedback/`);
  return r.results;
}

export interface CreatePipInput {
  reason: string;
  start_date: string;
  end_date: string;
  review_id?: string;
  goals?: string[];
}

function createPip(employmentId: string, input: CreatePipInput): Promise<PerformanceImprovementPlan> {
  return api.post<PerformanceImprovementPlan>(`/api/hr/employments/${employmentId}/pips/`, input);
}

async function listPipsForEmployment(employmentId: string): Promise<PerformanceImprovementPlan[]> {
  const r = await api.get<{ results: PerformanceImprovementPlan[] }>(`/api/hr/employments/${employmentId}/pips/`);
  return r.results;
}

function completePip(pipId: string): Promise<PerformanceImprovementPlan> {
  return api.post<PerformanceImprovementPlan>(`/api/hr/pips/${pipId}/complete/`);
}

function failPip(pipId: string): Promise<PerformanceImprovementPlan> {
  return api.post<PerformanceImprovementPlan>(`/api/hr/pips/${pipId}/fail/`);
}

// -- Learning & Development ------------------------------------------

export type TrainingEnrollmentStatus = "enrolled" | "in_progress" | "completed" | "failed";
export type DevelopmentPlanStatus = "active" | "completed";

export interface TrainingProgram {
  id: string;
  container_id: string;
  name: string;
  description: string;
  provider: string;
  cost_amount: number | null;
  cost_currency: string | null;
  duration_hours: number | null;
}

export interface TrainingEnrollment {
  id: string;
  employment_id: string;
  training_program_id: string;
  status: TrainingEnrollmentStatus;
  score: number | null;
  enrolled_at: string | null;
  completed_at: string | null;
}

export interface Certification {
  id: string;
  employee_id: string;
  name: string;
  issuing_body: string;
  issued_at: string | null;
  expires_at: string | null;
  credential_asset_id: string | null;
}

export interface DevelopmentPlan {
  id: string;
  employment_id: string;
  skill_gap_ids: string[];
  plan_description: string;
  target_date: string | null;
  status: DevelopmentPlanStatus;
  created_at: string | null;
}

function createTrainingProgram(
  containerId: string,
  input: {
    name: string;
    description?: string;
    provider?: string;
    cost_amount?: number;
    cost_currency?: string;
    duration_hours?: number;
  },
): Promise<TrainingProgram> {
  return api.post<TrainingProgram>(`/api/hr/containers/${containerId}/training-programs/`, input);
}

async function listTrainingProgramsForContainer(containerId: string): Promise<TrainingProgram[]> {
  const r = await api.get<{ results: TrainingProgram[] }>(`/api/hr/containers/${containerId}/training-programs/`);
  return r.results;
}

/** Self, or learning.manage (for enroll); self/manager/learning.view
 * for reading. */
async function listTrainingEnrollments(employmentId: string): Promise<TrainingEnrollment[]> {
  const r = await api.get<{ results: TrainingEnrollment[] }>(`/api/hr/employments/${employmentId}/training-enrollments/`);
  return r.results;
}

function enrollTraining(employmentId: string, trainingProgramId: string): Promise<TrainingEnrollment> {
  return api.post<TrainingEnrollment>(`/api/hr/employments/${employmentId}/training-enrollments/`, {
    training_program_id: trainingProgramId,
  });
}

function startTraining(enrollmentId: string): Promise<TrainingEnrollment> {
  return api.post<TrainingEnrollment>(`/api/hr/training-enrollments/${enrollmentId}/start/`);
}

function completeTraining(enrollmentId: string, score?: number): Promise<TrainingEnrollment> {
  return api.post<TrainingEnrollment>(`/api/hr/training-enrollments/${enrollmentId}/complete/`, { score });
}

function failTraining(enrollmentId: string): Promise<TrainingEnrollment> {
  return api.post<TrainingEnrollment>(`/api/hr/training-enrollments/${enrollmentId}/fail/`);
}

function createCertification(
  employeeId: string,
  input: {
    name: string;
    issuing_body?: string;
    issued_at?: string;
    expires_at?: string;
    credential_asset_id?: string;
  },
): Promise<Certification> {
  return api.post<Certification>(`/api/hr/employees/${employeeId}/certifications/`, input);
}

async function listCertifications(employeeId: string): Promise<Certification[]> {
  const r = await api.get<{ results: Certification[] }>(`/api/hr/employees/${employeeId}/certifications/`);
  return r.results;
}

function createDevelopmentPlan(
  employmentId: string,
  input: { skill_gap_ids?: string[]; plan_description?: string; target_date?: string },
): Promise<DevelopmentPlan> {
  return api.post<DevelopmentPlan>(`/api/hr/employments/${employmentId}/development-plans/`, input);
}

async function listDevelopmentPlans(employmentId: string): Promise<DevelopmentPlan[]> {
  const r = await api.get<{ results: DevelopmentPlan[] }>(`/api/hr/employments/${employmentId}/development-plans/`);
  return r.results;
}

function completeDevelopmentPlan(planId: string): Promise<DevelopmentPlan> {
  return api.post<DevelopmentPlan>(`/api/hr/development-plans/${planId}/complete/`);
}

// -- Career & Succession ---------------------------------------------------

export type Readiness = "ready_now" | "ready_1_2_years" | "ready_3_plus_years";

export interface CareerPath {
  id: string;
  container_id: string;
  from_position_id: string;
  to_position_id: string;
  description: string;
}

export interface SuccessionPlan {
  id: string;
  position_id: string;
  note: string;
  created_at: string | null;
}

export interface PotentialSuccessor {
  id: string;
  succession_plan_id: string;
  employee_id: string;
  readiness: Readiness;
  development_notes: string;
}

function createCareerPath(
  containerId: string,
  input: { from_position_id: string; to_position_id: string; description?: string },
): Promise<CareerPath> {
  return api.post<CareerPath>(`/api/hr/containers/${containerId}/career-paths/`, input);
}

async function listCareerPathsFromPosition(positionId: string): Promise<CareerPath[]> {
  const r = await api.get<{ results: CareerPath[] }>(`/api/hr/positions/${positionId}/career-paths/`);
  return r.results;
}

async function getSuccessionPlanForPosition(positionId: string): Promise<SuccessionPlan | null> {
  const r = await api.get<Partial<SuccessionPlan>>(`/api/hr/positions/${positionId}/succession-plan/`);
  return r.id ? (r as SuccessionPlan) : null;
}

function createSuccessionPlan(positionId: string, note?: string): Promise<SuccessionPlan> {
  return api.post<SuccessionPlan>(`/api/hr/positions/${positionId}/succession-plan/`, { note });
}

function addPotentialSuccessor(
  successionPlanId: string,
  input: { employee_id: string; readiness: Readiness; development_notes?: string },
): Promise<PotentialSuccessor> {
  return api.post<PotentialSuccessor>(`/api/hr/succession-plans/${successionPlanId}/successors/`, input);
}

async function listPotentialSuccessors(successionPlanId: string): Promise<PotentialSuccessor[]> {
  const r = await api.get<{ results: PotentialSuccessor[] }>(`/api/hr/succession-plans/${successionPlanId}/successors/`);
  return r.results;
}

function removePotentialSuccessor(
  successionPlanId: string,
  successorId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/hr/succession-plans/${successionPlanId}/successors/${successorId}/remove/`,
  );
}

// -- Employee Relations ------------------------------------------------

export type HRCaseType = "grievance" | "disciplinary" | "complaint" | "investigation";
export type HRCaseStatus = "open" | "investigating" | "resolved" | "closed";
export type WarningType = "verbal" | "written" | "final";

export interface HRCase {
  id: string;
  container_id: string;
  type: HRCaseType;
  employee_id: string;
  raised_by_actor_id: string | null;
  description: string;
  severity: string;
  confidential: boolean;
  status: HRCaseStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface HRCaseNote {
  id: string;
  case_id: string;
  author_actor_id: string;
  note: string;
  created_at: string | null;
}

export interface Warning {
  id: string;
  employment_id: string;
  warning_type: WarningType;
  reason: string;
  issued_by_actor_id: string;
  case_id: string | null;
  issued_at: string | null;
  expires_at: string | null;
}

export interface CreateHRCaseInput {
  type: HRCaseType;
  employee_id: string;
  raised_by_actor_id?: string;
  description?: string;
  severity?: string;
  confidential?: boolean;
}

function createHRCase(containerId: string, input: CreateHRCaseInput): Promise<HRCase> {
  return api.post<HRCase>(`/api/hr/containers/${containerId}/hr-cases/`, input);
}

async function listHRCasesForContainer(containerId: string): Promise<HRCase[]> {
  const r = await api.get<{ results: HRCase[] }>(`/api/hr/containers/${containerId}/hr-cases/`);
  return r.results;
}

function getHRCase(caseId: string): Promise<HRCase> {
  return api.get<HRCase>(`/api/hr/hr-cases/${caseId}/`);
}

function startInvestigatingHRCase(caseId: string): Promise<HRCase> {
  return api.post<HRCase>(`/api/hr/hr-cases/${caseId}/start-investigating/`);
}

function resolveHRCase(caseId: string): Promise<HRCase> {
  return api.post<HRCase>(`/api/hr/hr-cases/${caseId}/resolve/`);
}

function closeHRCase(caseId: string): Promise<HRCase> {
  return api.post<HRCase>(`/api/hr/hr-cases/${caseId}/close/`);
}

function addHRCaseNote(caseId: string, note: string): Promise<HRCaseNote> {
  return api.post<HRCaseNote>(`/api/hr/hr-cases/${caseId}/notes/`, { note });
}

async function listHRCaseNotes(caseId: string): Promise<HRCaseNote[]> {
  const r = await api.get<{ results: HRCaseNote[] }>(`/api/hr/hr-cases/${caseId}/notes/`);
  return r.results;
}

function issueWarning(
  employmentId: string,
  input: { warning_type: WarningType; reason: string; case_id?: string; expires_at?: string },
): Promise<Warning> {
  return api.post<Warning>(`/api/hr/employments/${employmentId}/warnings/`, input);
}

async function listWarningsForEmployment(employmentId: string): Promise<Warning[]> {
  const r = await api.get<{ results: Warning[] }>(`/api/hr/employments/${employmentId}/warnings/`);
  return r.results;
}

export const hr = {
  createJob, listJobsForContainer, getJob, updateJob, archiveJob, reactivateJob,
  createPosition, listVacantPositions, getPosition, updatePosition,
  fillPosition, vacatePosition, freezePosition, closePosition,
  addPositionSkillRequirement, listPositionSkillRequirements, removePositionSkillRequirement,
  createEmployee, listEmployeesForContainer, getMyEmployeeProfile, getEmployee, updateEmployee,
  createEmployment, listEmploymentsForEmployee, getEmployment, listMyDirectReports,
  transferEmployment, suspendEmployment, reactivateEmployment, terminateEmployment,
  listEmploymentHistory,
  createContract, listContractsForEmployment, activateContract, expireContract, terminateContract,
  createSkill, listSkillsForContainer, addEmployeeSkill, listEmployeeSkills,
  createJobOpening, listJobOpeningsForContainer, listOpenJobOpenings, getJobOpening,
  putJobOpeningOnHold, reopenJobOpening, closeJobOpening, fillJobOpening,
  createCandidate, createApplication, listApplicationsForOpening, getApplication,
  advanceApplication, withdrawApplication,
  scheduleInterview, listInterviewsForApplication, listMyInterviews,
  rescheduleInterview, completeInterview, cancelInterview,
  createOffer, listOffersForApplication, sendOffer, acceptOffer, declineOffer, rescindOffer,
  createShift, listShiftsForContainer, assignSchedule, listScheduleForEmployment,
  checkIn, checkOut, markAttendanceStatus, logOvertime, approveOvertime,
  listAttendanceForEmployment,
  createTimesheet, listTimesheetsForEmployment, listTimesheetsPendingForMe,
  submitTimesheet, approveTimesheet, rejectTimesheet,
  createLeaveType, listLeaveTypesForContainer,
  createLeaveBalance, listLeaveBalances,
  listLeaveRecords, createLeaveRecord, cancelLeaveRecord,
  createLeaveRequest, listLeaveRequestsForEmployment, listMyLeaveRequests,
  approveLeaveRequest, rejectLeaveRequest,
  listCompensationHistory, createCompensationRecord, getCurrentCompensation,
  createBenefitPlan, listBenefitPlansForContainer,
  listBenefitEnrollments, enrollBenefit, cancelBenefitEnrollment,
  createGoal, listGoalsForOwner, listGoalChildren, updateGoal, startGoal, completeGoal, markGoalMissed,
  listReviewsForEmployment, createPerformanceReview, listMyReviewsToGive,
  submitPerformanceReview, finalizePerformanceReview,
  addReviewFeedback, listReviewFeedback,
  createPip, listPipsForEmployment, completePip, failPip,
  createTrainingProgram, listTrainingProgramsForContainer,
  listTrainingEnrollments, enrollTraining, startTraining, completeTraining, failTraining,
  createCertification, listCertifications,
  createDevelopmentPlan, listDevelopmentPlans, completeDevelopmentPlan,
  createCareerPath, listCareerPathsFromPosition,
  getSuccessionPlanForPosition, createSuccessionPlan,
  addPotentialSuccessor, listPotentialSuccessors, removePotentialSuccessor,
  createHRCase, listHRCasesForContainer, getHRCase,
  startInvestigatingHRCase, resolveHRCase, closeHRCase,
  addHRCaseNote, listHRCaseNotes,
  issueWarning, listWarningsForEmployment,
};
