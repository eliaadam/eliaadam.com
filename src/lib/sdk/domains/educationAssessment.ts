import { api } from "../../query/Api";

/**
 * Typed client for `core.education_assessment`'s REST API
 * (`/api/education/assessment/...`) — gradable components, scores, and
 * a fully configurable grading scale (score → letter → GPA).
 */

export interface AssessmentComponent {
  id: string;
  class_offering_id: string;
  name: string;
  category: string;
  max_score: number;
  weight: number;
  is_active: boolean;
}

export interface Score {
  id: string;
  class_enrollment_id: string;
  component_id: string;
  score_value: number;
  graded_by_actor_id: string | null;
  graded_at: string | null;
  updated_at: string | null;
  comments: string;
}

export interface GradeBand {
  min_percent: number;
  max_percent: number;
  letter: string;
  gpa_points: number | null;
}

export interface GradingScale {
  id: string;
  name: string;
  is_default: boolean;
  bands: GradeBand[];
}

export interface ComponentBreakdown {
  component_id: string;
  name: string;
  score_value: number | null;
  max_score: number;
  weight: number;
}

export interface GradeResult {
  class_enrollment_id: string;
  percentage: number;
  letter: string | null;
  gpa_points: number | null;
  components: ComponentBreakdown[];
}

function base(containerId: string) {
  return `/api/education/assessment/containers/${containerId}`;
}

function components(containerId: string) {
  return {
    list: (classOfferingId: string, activeOnly = false) =>
      api
        .get<{ components: AssessmentComponent[] }>(`${base(containerId)}/class-offerings/${classOfferingId}/components/${activeOnly ? "?active_only=true" : ""}`)
        .then((r) => r.components),
    create: (classOfferingId: string, input: { name: string; category?: string; max_score?: number; weight?: number }) =>
      api.post<AssessmentComponent>(`${base(containerId)}/class-offerings/${classOfferingId}/components/create/`, input),
    get: (componentId: string) => api.get<AssessmentComponent>(`${base(containerId)}/components/${componentId}/`),
    update: (componentId: string, changes: Partial<Pick<AssessmentComponent, "name" | "category" | "max_score" | "weight">>) =>
      api.post<AssessmentComponent>(`${base(containerId)}/components/${componentId}/update/`, changes),
    deactivate: (componentId: string) => api.post<AssessmentComponent>(`${base(containerId)}/components/${componentId}/deactivate/`, {}),
  };
}

function scores(containerId: string) {
  return {
    record: (componentId: string, input: { class_enrollment_id: string; score_value: number; comments?: string }) =>
      api.post<Score>(`${base(containerId)}/components/${componentId}/scores/record/`, input),
    recordBulk: (componentId: string, entries: { class_enrollment_id: string; score_value: number; comments?: string }[]) =>
      api.post<{ scores: Score[] }>(`${base(containerId)}/components/${componentId}/scores/record-bulk/`, { entries }).then((r) => r.scores),
    forComponent: (componentId: string) =>
      api.get<{ scores: Score[] }>(`${base(containerId)}/components/${componentId}/scores/`).then((r) => r.scores),
    forClassEnrollment: (classEnrollmentId: string) =>
      api.get<{ scores: Score[] }>(`${base(containerId)}/class-enrollments/${classEnrollmentId}/scores/`).then((r) => r.scores),
  };
}

function gradingScales(containerId: string) {
  const b = `${base(containerId)}/grading-scales`;
  return {
    list: () => api.get<{ grading_scales: GradingScale[] }>(`${b}/`).then((r) => r.grading_scales),
    get: (scaleId: string) => api.get<GradingScale>(`${b}/${scaleId}/`),
    create: (input: { name: string; bands: GradeBand[]; is_default?: boolean }) => api.post<GradingScale>(`${b}/create/`, input),
    setDefault: (scaleId: string) => api.post<GradingScale>(`${b}/${scaleId}/set-default/`, {}),
  };
}

function grades(containerId: string) {
  return {
    compute: (classOfferingId: string, classEnrollmentId: string, gradingScaleId?: string) => {
      const qs = gradingScaleId ? `?grading_scale_id=${gradingScaleId}` : "";
      return api.get<GradeResult>(`${base(containerId)}/class-offerings/${classOfferingId}/class-enrollments/${classEnrollmentId}/grade/${qs}`);
    },
  };
}

export const educationAssessment = { components, scores, gradingScales, grades };
