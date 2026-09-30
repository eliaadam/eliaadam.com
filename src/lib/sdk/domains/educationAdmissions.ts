import { api } from "../../query/Api";

/**
 * Typed client for `core.education_admissions`'s REST API
 * (`/api/education/admissions/...`) — applicants, applications, and the
 * one-time conversion of an accepted application into a real enrollment.
 */

export interface Applicant {
  id: string;
  name: string;
  date_of_birth: string | null;
  email: string;
  phone: string;
  guardian_contact_id: string | null;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "rejected" | "withdrawn" | "enrolled";

export interface Application {
  id: string;
  applicant_id: string;
  program_id: string;
  starting_period_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  status_changed_at: string | null;
  decided_at: string | null;
  decision_reason: string;
  reviewer_actor_id: string | null;
  enrolled_student_id: string | null;
}

function applicants(containerId: string) {
  const base = `/api/education/admissions/containers/${containerId}/applicants`;
  return {
    list: (search?: string) => api.get<{ applicants: Applicant[] }>(`${base}/${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((r) => r.applicants),
    get: (applicantId: string) => api.get<Applicant>(`${base}/${applicantId}/`),
    create: (input: { name: string; date_of_birth?: string; email?: string; phone?: string; guardian_contact_id?: string; notes?: string }) =>
      api.post<Applicant>(`${base}/create/`, input),
    update: (applicantId: string, changes: Partial<Pick<Applicant, "name" | "date_of_birth" | "email" | "phone" | "guardian_contact_id" | "notes">>) =>
      api.post<Applicant>(`${base}/${applicantId}/update/`, changes),
    applications: (applicantId: string) =>
      api.get<{ applications: Application[] }>(`${base}/${applicantId}/applications/`).then((r) => r.applications),
  };
}

function applications(containerId: string) {
  const base = `/api/education/admissions/containers/${containerId}/applications`;
  return {
    list: (programId: string, status?: ApplicationStatus) => {
      const qs = new URLSearchParams({ program_id: programId });
      if (status) qs.set("status", status);
      return api.get<{ applications: Application[] }>(`${base}/?${qs.toString()}`).then((r) => r.applications);
    },
    get: (applicationId: string) => api.get<Application>(`${base}/${applicationId}/`),
    submit: (input: { applicant_id: string; program_id: string; starting_period_id: string }) => api.post<Application>(`${base}/submit/`, input),
    startReview: (applicationId: string) => api.post<Application>(`${base}/${applicationId}/start-review/`, {}),
    accept: (applicationId: string) => api.post<Application>(`${base}/${applicationId}/accept/`, {}),
    reject: (applicationId: string, reason: string) => api.post<Application>(`${base}/${applicationId}/reject/`, { reason }),
    withdraw: (applicationId: string) => api.post<Application>(`${base}/${applicationId}/withdraw/`, {}),
    enroll: (applicationId: string, studentNumber: string, sectionLabel?: string) =>
      api.post<Application>(`${base}/${applicationId}/enroll/`, { student_number: studentNumber, section_label: sectionLabel }),
  };
}

export const educationAdmissions = { applicants, applications };
