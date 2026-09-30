import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { ProgramEnrollment, Student } from "../../../lib/sdk/domains/educationEnrollment";
import type { Program } from "../../../lib/sdk/domains/educationAcademic";
import { cardClass, errorMessage, errorTextClass, formatDate, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, StatusBadge } from "./ui";

export function StudentsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: students, isLoading } = useQuery({
    queryKey: ["edu-students", containerId, search],
    queryFn: () => sdk.educationEnrollment.students(containerId).list(search || undefined),
  });
  const { data: programs } = useQuery({ queryKey: ["edu-programs", containerId], queryFn: () => sdk.educationAcademic.programs(containerId).list() });
  const [selected, setSelected] = useState<string | null>(null);

  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-students", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationEnrollment.students(containerId).create({ student_number: studentNumber.trim(), name: name.trim() }),
    onSuccess: (s) => { setStudentNumber(""); setName(""); invalidate(); setSelected(s.id); },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <div>
        <input className={inputClass} placeholder="Search by name or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className={`mt-2 ${cardClass}`}>
          <div className="max-h-[24rem] overflow-y-auto">
            {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
            {students?.length === 0 && <p className="p-3 text-sm text-neutral-500">No students found.</p>}
            {students?.map((s: Student) => (
              <button
                key={s.id} type="button" onClick={() => setSelected(s.id)}
                className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === s.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="font-mono text-xs text-neutral-500">{s.student_number}</div>
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New student</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Student number</label>
              <input className={inputClass} value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="STU-0001" />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button
              type="button" className={`w-full ${primaryButtonClass}`} disabled={!studentNumber.trim() || !name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Adding…" : "Add student"}
            </button>
            {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't add the student.")}</p>}
          </div>
        </div>
      </div>
      <div>{selected && <StudentDetail containerId={containerId} studentId={selected} programs={programs ?? []} />}</div>
    </div>
  );
}

function StudentDetail({ containerId, studentId, programs }: { containerId: string; studentId: string; programs: Program[] }) {
  const queryClient = useQueryClient();
  const { data: student } = useQuery({ queryKey: ["edu-student", containerId, studentId], queryFn: () => sdk.educationEnrollment.students(containerId).get(studentId) });
  const { data: enrollments } = useQuery({
    queryKey: ["edu-student-enrollments", containerId, studentId],
    queryFn: () => sdk.educationEnrollment.students(containerId).enrollments(studentId),
  });
  const { data: periods } = useQuery({ queryKey: ["edu-periods", containerId], queryFn: () => sdk.educationAcademic.periods(containerId).list() });

  const [programId, setProgramId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-student-enrollments", containerId, studentId] });
  const enroll = useMutation({
    mutationFn: () =>
      sdk.educationEnrollment.enrollments(containerId).enroll({ student_id: studentId, program_id: programId, starting_period_id: periodId, section_label: sectionLabel.trim() || undefined }),
    onSuccess: () => { setProgramId(""); setPeriodId(""); setSectionLabel(""); invalidate(); },
  });
  const graduate = useMutation({ mutationFn: (id: string) => sdk.educationEnrollment.enrollments(containerId).graduate(id), onSuccess: invalidate });
  const withdraw = useMutation({
    mutationFn: (id: string) => sdk.educationEnrollment.enrollments(containerId).withdraw(id, prompt("Reason for withdrawal?") || ""),
    onSuccess: invalidate,
  });

  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? id;
  const selectedProgram = programs.find((p) => p.id === programId);

  return (
    <div className="space-y-4">
      {student && (
        <div className={`${cardClass} p-4`}>
          <h2 className="text-lg font-semibold">{student.name}</h2>
          <p className="text-xs text-neutral-500">{student.student_number}{student.date_of_birth ? ` · Born ${formatDate(student.date_of_birth)}` : ""}</p>
        </div>
      )}

      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">Enroll into a program</h3>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[11rem] flex-1">
            <label className={labelClass}>Program</label>
            <select className={inputClass} value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">Choose a program…</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="min-w-[11rem] flex-1">
            <label className={labelClass}>Starting period</label>
            <select className={inputClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Choose a period…</option>
              {periods?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProgram?.enrollment_mode === "fixed_curriculum" && (
            <div className="w-28">
              <label className={labelClass}>Section</label>
              <input className={inputClass} value={sectionLabel} onChange={(e) => setSectionLabel(e.target.value)} placeholder="5A" />
            </div>
          )}
          <button type="button" className={secondaryButtonClass} disabled={!programId || !periodId || enroll.isPending} onClick={() => enroll.mutate()}>
            {enroll.isPending ? "Enrolling…" : "Enroll"}
          </button>
        </div>
        {enroll.isError && <p className={`mt-1.5 ${errorTextClass}`}>{errorMessage(enroll.error, "Couldn't enroll this student.")}</p>}
      </div>

      <div className="space-y-3">
        {enrollments?.length === 0 && <p className="text-sm text-neutral-500">Not enrolled in anything yet.</p>}
        {enrollments?.map((e: ProgramEnrollment) => (
          <div key={e.id} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{programName(e.program_id)}{e.section_label ? ` — ${e.section_label}` : ""}</div>
                <div className="mt-0.5 text-xs text-neutral-500">Enrolled {formatDate(e.enrolled_at?.slice(0, 10) ?? null)}</div>
              </div>
              <StatusBadge status={e.status} />
            </div>
            {e.status === "active" && (
              <div className="mt-3 flex gap-2">
                <button type="button" className={secondaryButtonClass} disabled={graduate.isPending} onClick={() => graduate.mutate(e.id)}>Graduate</button>
                <button type="button" className={secondaryButtonClass} disabled={withdraw.isPending} onClick={() => withdraw.mutate(e.id)}>Withdraw</button>
              </div>
            )}
            {e.status === "withdrawn" && e.withdrawal_reason && <p className="mt-2 text-xs text-neutral-500">Reason: {e.withdrawal_reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
