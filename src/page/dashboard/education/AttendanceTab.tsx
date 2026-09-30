import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { AttendanceStatus } from "../../../lib/sdk/domains/educationAttendance";
import type { Period, Program } from "../../../lib/sdk/domains/educationAcademic";
import { cardClass, errorMessage, errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, todayIso } from "./ui";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];
const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };

export function AttendanceTab({ containerId }: { containerId: string }) {
  const { data: periods } = useQuery({ queryKey: ["edu-periods", containerId], queryFn: () => sdk.educationAcademic.periods(containerId).list() });
  const { data: programs } = useQuery({ queryKey: ["edu-programs", containerId], queryFn: () => sdk.educationAcademic.programs(containerId).list() });
  const [periodId, setPeriodId] = useState("");
  const [programId, setProgramId] = useState("");
  const { data: offerings } = useQuery({
    queryKey: ["edu-offerings", containerId, periodId, programId],
    queryFn: () => sdk.educationAcademic.classOfferings(containerId).list({ period_id: periodId || undefined, program_id: programId || undefined }),
    enabled: !!periodId && !!programId,
  });
  const [offeringId, setOfferingId] = useState("");
  const [date, setDate] = useState(todayIso());

  return (
    <div>
      <div className={`${cardClass} flex flex-wrap items-end gap-2 p-4`}>
        <div className="min-w-[10rem]">
          <label className={labelClass}>Period</label>
          <select className={inputClass} value={periodId} onChange={(e) => { setPeriodId(e.target.value); setOfferingId(""); }}>
            <option value="">Choose a period…</option>
            {periods?.map((p: Period) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="min-w-[10rem]">
          <label className={labelClass}>Program</label>
          <select className={inputClass} value={programId} onChange={(e) => { setProgramId(e.target.value); setOfferingId(""); }}>
            <option value="">Choose a program…</option>
            {programs?.map((p: Program) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="min-w-[10rem]">
          <label className={labelClass}>Class offering</label>
          <select className={inputClass} value={offeringId} onChange={(e) => setOfferingId(e.target.value)} disabled={!offerings?.length}>
            <option value="">Choose a class…</option>
            {offerings?.map((o) => <option key={o.id} value={o.id}>{o.section_label || "Class"}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        {offeringId && date ? (
          <RosterAttendance containerId={containerId} classOfferingId={offeringId} date={date} />
        ) : (
          <p className="text-sm text-neutral-500">Choose a period, program, class, and date to take attendance.</p>
        )}
      </div>
    </div>
  );
}

function RosterAttendance({ containerId, classOfferingId, date }: { containerId: string; classOfferingId: string; date: string }) {
  const queryClient = useQueryClient();
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ["edu-roster", containerId, classOfferingId],
    queryFn: () => sdk.educationEnrollment.roster(containerId).forOffering(classOfferingId),
  });
  const { data: existing } = useQuery({
    queryKey: ["edu-attendance", containerId, classOfferingId, date],
    queryFn: () => sdk.educationAttendance.forOfferingAndDate(containerId, classOfferingId, date),
  });
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const statusFor = (classEnrollmentId: string): AttendanceStatus =>
    statuses[classEnrollmentId] ?? existing?.find((r) => r.class_enrollment_id === classEnrollmentId)?.status ?? "present";

  const save = useMutation({
    mutationFn: () =>
      sdk.educationAttendance.recordBulk(containerId, {
        class_offering_id: classOfferingId,
        date,
        entries: (roster ?? []).map((r) => ({ class_enrollment_id: r.class_enrollment_id, status: statusFor(r.class_enrollment_id) })),
      }),
    onSuccess: () => {
      setStatuses({});
      queryClient.invalidateQueries({ queryKey: ["edu-attendance", containerId, classOfferingId, date] });
    },
  });

  if (rosterLoading) return <p className="text-sm text-neutral-500">Loading roster…</p>;
  if (roster?.length === 0) return <p className="text-sm text-neutral-500">No students are actively enrolled in this class.</p>;

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {roster?.map((r) => (
            <Fragment key={r.class_enrollment_id}>
              <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.student_name}</div>
                  <div className="font-mono text-xs text-neutral-500">{r.student_number}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {STATUSES.map((s) => (
                      <button
                        key={s} type="button"
                        className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                          statusFor(r.class_enrollment_id) === s
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                        }`}
                        onClick={() => setStatuses((prev) => ({ ...prev, [r.class_enrollment_id]: s }))}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button" className={secondaryButtonClass}
                    onClick={() => setExpandedStudent((v) => (v === r.class_enrollment_id ? null : r.class_enrollment_id))}
                  >
                    History
                  </button>
                </td>
              </tr>
              {expandedStudent === r.class_enrollment_id && (
                <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="px-3 py-3" colSpan={3}>
                    <AttendanceSummary containerId={containerId} classEnrollmentId={r.class_enrollment_id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-neutral-200 p-3 dark:border-neutral-800">
        {save.isError ? (
          <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save attendance.")}</p>
        ) : (
          <span className="text-xs text-neutral-500">{Object.keys(statuses).length > 0 ? "Unsaved changes" : "\u00A0"}</span>
        )}
        <button type="button" className={primaryButtonClass} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save attendance"}
        </button>
      </div>
    </div>
  );
}

function AttendanceSummary({ containerId, classEnrollmentId }: { containerId: string; classEnrollmentId: string }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["edu-attendance-summary", containerId, classEnrollmentId],
    queryFn: () => sdk.educationAttendance.summaryForClassEnrollment(containerId, classEnrollmentId),
  });
  if (isLoading) return <p className="text-xs text-neutral-500">Loading…</p>;
  if (!summary || summary.total === 0) return <p className="text-xs text-neutral-500">No attendance recorded yet for this class.</p>;
  return (
    <div className="flex flex-wrap gap-4 text-xs text-neutral-600 dark:text-neutral-400">
      {STATUSES.map((s) => (
        <span key={s}>{STATUS_LABEL[s]}: <span className="font-medium text-neutral-900 dark:text-neutral-100">{summary.counts[s]}</span></span>
      ))}
      <span>
        Attendance rate:{" "}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {summary.attendance_rate !== null ? `${Math.round(summary.attendance_rate * 100)}%` : "—"}
        </span>
      </span>
    </div>
  );
}
