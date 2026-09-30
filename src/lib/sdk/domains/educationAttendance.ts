import { api } from "../../query/Api";

/**
 * Typed client for `core.education_attendance`'s REST API
 * (`/api/education/attendance/...`) — per-class-session attendance.
 * Recording is an upsert: submitting the same (class enrollment, date)
 * again corrects it, not a special "edit" endpoint.
 */

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  class_enrollment_id: string;
  class_offering_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by_actor_id: string | null;
  recorded_at: string | null;
  updated_at: string | null;
  notes: string;
}

export interface AttendanceSummary {
  counts: Record<AttendanceStatus, number>;
  total: number;
  attendance_rate: number | null;
}

function base(containerId: string) {
  return `/api/education/attendance/containers/${containerId}`;
}

function record(containerId: string, input: { class_offering_id: string; class_enrollment_id: string; date: string; status: AttendanceStatus; notes?: string }) {
  return api.post<AttendanceRecord>(`${base(containerId)}/record/`, input);
}

function recordBulk(
  containerId: string,
  input: { class_offering_id: string; date: string; entries: { class_enrollment_id: string; status: AttendanceStatus; notes?: string }[] },
) {
  return api.post<{ records: AttendanceRecord[] }>(`${base(containerId)}/record-bulk/`, input).then((r) => r.records);
}

function forOfferingAndDate(containerId: string, classOfferingId: string, date: string) {
  return api.get<{ records: AttendanceRecord[] }>(`${base(containerId)}/class-offerings/${classOfferingId}/?date=${date}`).then((r) => r.records);
}

function forClassEnrollment(containerId: string, classEnrollmentId: string) {
  return api.get<{ records: AttendanceRecord[] }>(`${base(containerId)}/class-enrollments/${classEnrollmentId}/`).then((r) => r.records);
}

function summaryForClassEnrollment(containerId: string, classEnrollmentId: string) {
  return api.get<AttendanceSummary>(`${base(containerId)}/class-enrollments/${classEnrollmentId}/summary/`);
}

export const educationAttendance = { record, recordBulk, forOfferingAndDate, forClassEnrollment, summaryForClassEnrollment };
