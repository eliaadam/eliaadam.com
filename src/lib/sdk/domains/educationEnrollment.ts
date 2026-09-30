import { api } from "../../query/Api";

/**
 * Typed client for `core.education_enrollment`'s REST API
 * (`/api/education/enrollment/...`) — students and their enrollment
 * lifecycle: active → graduated | withdrawn.
 */

export interface Student {
  id: string;
  student_number: string;
  name: string;
  date_of_birth: string | null;
  guardian_contact_id: string | null;
  linked_contact_id: string | null;
  is_active: boolean;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export type ProgramEnrollmentStatus = "active" | "graduated" | "withdrawn";

export interface ProgramEnrollment {
  id: string;
  student_id: string;
  program_id: string;
  starting_period_id: string;
  status: ProgramEnrollmentStatus;
  section_label: string;
  enrolled_at: string | null;
  status_changed_at: string | null;
  withdrawal_reason: string;
  graduated_at: string | null;
}

export type ClassEnrollmentStatus = "active" | "completed" | "withdrawn";

export interface ClassEnrollment {
  id: string;
  program_enrollment_id: string;
  class_offering_id: string;
  status: ClassEnrollmentStatus;
  enrolled_at: string | null;
  status_changed_at: string | null;
}

export interface RosterEntry {
  class_enrollment_id: string;
  class_enrollment_status: ClassEnrollmentStatus;
  program_enrollment_id: string;
  student_id: string;
  student_number: string;
  student_name: string;
}

function students(containerId: string) {
  const base = `/api/education/enrollment/containers/${containerId}/students`;
  return {
    list: (search?: string) => api.get<{ students: Student[] }>(`${base}/${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((r) => r.students),
    get: (studentId: string) => api.get<Student>(`${base}/${studentId}/`),
    create: (input: { student_number: string; name: string; date_of_birth?: string; guardian_contact_id?: string; linked_contact_id?: string }) =>
      api.post<Student>(`${base}/create/`, input),
    update: (studentId: string, changes: Partial<Pick<Student, "name" | "date_of_birth" | "guardian_contact_id" | "linked_contact_id" | "notes" | "student_number">>) =>
      api.post<Student>(`${base}/${studentId}/update/`, changes),
    activate: (studentId: string) => api.post<Student>(`${base}/${studentId}/activate/`, {}),
    deactivate: (studentId: string) => api.post<Student>(`${base}/${studentId}/deactivate/`, {}),
    enrollments: (studentId: string) =>
      api.get<{ enrollments: ProgramEnrollment[] }>(`${base}/${studentId}/enrollments/`).then((r) => r.enrollments),
  };
}

function enrollments(containerId: string) {
  const base = `/api/education/enrollment/containers/${containerId}/enrollments`;
  return {
    list: (programId: string, status?: ProgramEnrollmentStatus) => {
      const qs = new URLSearchParams({ program_id: programId });
      if (status) qs.set("status", status);
      return api.get<{ enrollments: ProgramEnrollment[] }>(`${base}/?${qs.toString()}`).then((r) => r.enrollments);
    },
    get: (enrollmentId: string) => api.get<ProgramEnrollment>(`${base}/${enrollmentId}/`),
    enroll: (input: { student_id: string; program_id: string; starting_period_id: string; section_label?: string }) =>
      api.post<ProgramEnrollment>(`${base}/enroll/`, input),
    graduate: (enrollmentId: string) => api.post<ProgramEnrollment>(`${base}/${enrollmentId}/graduate/`, {}),
    withdraw: (enrollmentId: string, reason: string) => api.post<ProgramEnrollment>(`${base}/${enrollmentId}/withdraw/`, { reason }),
    classes: (enrollmentId: string, status?: ClassEnrollmentStatus) => {
      const qs = status ? `?status=${status}` : "";
      return api.get<{ class_enrollments: ClassEnrollment[] }>(`${base}/${enrollmentId}/classes/${qs}`).then((r) => r.class_enrollments);
    },
    enrollInClass: (enrollmentId: string, classOfferingId: string) =>
      api.post<ClassEnrollment>(`${base}/${enrollmentId}/classes/enroll/`, { class_offering_id: classOfferingId }),
  };
}

function classEnrollments(containerId: string) {
  const base = `/api/education/enrollment/containers/${containerId}/class-enrollments`;
  return {
    withdraw: (classEnrollmentId: string) => api.post<ClassEnrollment>(`${base}/${classEnrollmentId}/withdraw/`, {}),
    complete: (classEnrollmentId: string) => api.post<ClassEnrollment>(`${base}/${classEnrollmentId}/complete/`, {}),
  };
}

function roster(containerId: string) {
  return {
    forOffering: (classOfferingId: string, status: string | null = "active") => {
      const qs = status ? `?status=${status}` : "?status=";
      return api
        .get<{ roster: RosterEntry[] }>(`/api/education/enrollment/containers/${containerId}/class-offerings/${classOfferingId}/roster/${qs}`)
        .then((r) => r.roster);
    },
  };
}

export const educationEnrollment = { students, enrollments, classEnrollments, roster };
