import { api } from "../../query/Api";

/**
 * Typed client for `core.education_academic`'s REST API
 * (`/api/education/academic/...`) — periods, programs, subjects,
 * curriculum, and class offerings. Configurable by data, not by
 * institution type: a Program's `credit_bearing`/`enrollment_mode`
 * flags are what distinguish a K-12 grade from a university degree,
 * not separate code paths.
 */

export interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
}

export type EnrollmentMode = "fixed_curriculum" | "elective";

export interface Program {
  id: string;
  code: string;
  name: string;
  description: string;
  credit_bearing: boolean;
  enrollment_mode: EnrollmentMode;
  is_active: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface CurriculumEntry {
  id: string;
  program_id: string;
  subject_id: string;
  credit_value: number | null;
  is_required: boolean;
  prerequisite_subject_ids: string[];
}

export interface ClassOffering {
  id: string;
  period_id: string;
  program_id: string;
  subject_id: string;
  section_label: string;
  teacher_actor_id: string | null;
  capacity: number | null;
  is_active: boolean;
}

function periods(containerId: string) {
  const base = `/api/education/academic/containers/${containerId}/periods`;
  return {
    list: () => api.get<{ periods: Period[] }>(`${base}/`).then((r) => r.periods),
    create: (name: string, startDate: string, endDate: string) =>
      api.post<Period>(`${base}/create/`, { name, start_date: startDate, end_date: endDate }),
    close: (periodId: string) => api.post<Period>(`${base}/${periodId}/close/`, {}),
    reopen: (periodId: string) => api.post<Period>(`${base}/${periodId}/reopen/`, {}),
  };
}

function programs(containerId: string) {
  const base = `/api/education/academic/containers/${containerId}/programs`;
  return {
    list: () => api.get<{ programs: Program[] }>(`${base}/`).then((r) => r.programs),
    get: (programId: string) => api.get<Program>(`${base}/${programId}/`),
    create: (input: { code: string; name: string; description?: string; credit_bearing?: boolean; enrollment_mode?: EnrollmentMode }) =>
      api.post<Program>(`${base}/create/`, input),
    update: (programId: string, changes: Partial<Pick<Program, "code" | "name" | "description">>) =>
      api.post<Program>(`${base}/${programId}/update/`, changes),
    activate: (programId: string) => api.post<Program>(`${base}/${programId}/activate/`, {}),
    deactivate: (programId: string) => api.post<Program>(`${base}/${programId}/deactivate/`, {}),
  };
}

function subjects(containerId: string) {
  const base = `/api/education/academic/containers/${containerId}/subjects`;
  return {
    list: () => api.get<{ subjects: Subject[] }>(`${base}/`).then((r) => r.subjects),
    get: (subjectId: string) => api.get<Subject>(`${base}/${subjectId}/`),
    create: (input: { code: string; name: string; description?: string }) => api.post<Subject>(`${base}/create/`, input),
    update: (subjectId: string, changes: Partial<Pick<Subject, "code" | "name" | "description">>) =>
      api.post<Subject>(`${base}/${subjectId}/update/`, changes),
    activate: (subjectId: string) => api.post<Subject>(`${base}/${subjectId}/activate/`, {}),
    deactivate: (subjectId: string) => api.post<Subject>(`${base}/${subjectId}/deactivate/`, {}),
  };
}

function curriculum(containerId: string) {
  const base = (programId: string) => `/api/education/academic/containers/${containerId}/programs/${programId}/curriculum`;
  return {
    list: (programId: string) => api.get<{ entries: CurriculumEntry[] }>(`${base(programId)}/`).then((r) => r.entries),
    add: (
      programId: string,
      input: { subject_id: string; credit_value?: number | null; is_required?: boolean; prerequisite_subject_ids?: string[] },
    ) => api.post<CurriculumEntry>(`${base(programId)}/add/`, input),
    remove: (programId: string, subjectId: string) => api.post<{ removed: true }>(`${base(programId)}/${subjectId}/remove/`, {}),
  };
}

function classOfferings(containerId: string) {
  const base = `/api/education/academic/containers/${containerId}/class-offerings`;
  return {
    list: (filters?: { period_id?: string; program_id?: string; subject_id?: string }) => {
      const params = new URLSearchParams();
      if (filters?.period_id) params.set("period_id", filters.period_id);
      if (filters?.program_id) params.set("program_id", filters.program_id);
      if (filters?.subject_id) params.set("subject_id", filters.subject_id);
      const qs = params.toString();
      return api.get<{ class_offerings: ClassOffering[] }>(`${base}/${qs ? `?${qs}` : ""}`).then((r) => r.class_offerings);
    },
    get: (offeringId: string) => api.get<ClassOffering>(`${base}/${offeringId}/`),
    create: (input: {
      period_id: string; program_id: string; subject_id: string; section_label?: string; teacher_actor_id?: string | null; capacity?: number | null;
    }) => api.post<ClassOffering>(`${base}/create/`, input),
    update: (offeringId: string, changes: Partial<Pick<ClassOffering, "section_label" | "teacher_actor_id" | "capacity">>) =>
      api.post<ClassOffering>(`${base}/${offeringId}/update/`, changes),
    activate: (offeringId: string) => api.post<ClassOffering>(`${base}/${offeringId}/activate/`, {}),
    deactivate: (offeringId: string) => api.post<ClassOffering>(`${base}/${offeringId}/deactivate/`, {}),
  };
}

export const educationAcademic = { periods, programs, subjects, curriculum, classOfferings };
