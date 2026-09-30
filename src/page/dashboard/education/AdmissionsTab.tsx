import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Applicant, Application } from "../../../lib/sdk/domains/educationAdmissions";
import type { Program } from "../../../lib/sdk/domains/educationAcademic";
import { cardClass, errorMessage, errorTextClass, formatDateTime, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, StatusBadge } from "./ui";

export function AdmissionsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: applicants, isLoading } = useQuery({
    queryKey: ["edu-applicants", containerId],
    queryFn: () => sdk.educationAdmissions.applicants(containerId).list(),
  });
  const { data: programs } = useQuery({ queryKey: ["edu-programs", containerId], queryFn: () => sdk.educationAcademic.programs(containerId).list() });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-applicants", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationAdmissions.applicants(containerId).create({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined }),
    onSuccess: (a) => { setName(""); setEmail(""); setPhone(""); invalidate(); setSelected(a.id); },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <div>
        <div className={cardClass}>
          <div className="max-h-[28rem] overflow-y-auto">
            {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
            {applicants?.length === 0 && <p className="p-3 text-sm text-neutral-500">No applicants yet.</p>}
            {applicants?.map((a: Applicant) => (
              <button
                key={a.id} type="button" onClick={() => setSelected(a.id)}
                className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === a.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
              >
                <div className="font-medium">{a.name}</div>
                {a.email && <div className="text-xs text-neutral-500">{a.email}</div>}
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New applicant</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button type="button" className={`w-full ${primaryButtonClass}`} disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating…" : "Add applicant"}
            </button>
            {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't add the applicant.")}</p>}
          </div>
        </div>
      </div>
      <div>{selected && <ApplicantDetail containerId={containerId} applicantId={selected} programs={programs ?? []} />}</div>
    </div>
  );
}

function ApplicantDetail({ containerId, applicantId, programs }: { containerId: string; applicantId: string; programs: Program[] }) {
  const queryClient = useQueryClient();
  const { data: applications } = useQuery({
    queryKey: ["edu-applications-for-applicant", containerId, applicantId],
    queryFn: () => sdk.educationAdmissions.applicants(containerId).applications(applicantId),
  });
  const { data: periods } = useQuery({ queryKey: ["edu-periods", containerId], queryFn: () => sdk.educationAcademic.periods(containerId).list() });
  const [programId, setProgramId] = useState("");
  const [periodId, setPeriodId] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-applications-for-applicant", containerId, applicantId] });
  const submit = useMutation({
    mutationFn: () => sdk.educationAdmissions.applications(containerId).submit({ applicant_id: applicantId, program_id: programId, starting_period_id: periodId }),
    onSuccess: () => { setProgramId(""); setPeriodId(""); invalidate(); },
  });

  return (
    <div className="space-y-4">
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">New application</h3>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <label className={labelClass}>Program</label>
            <select className={inputClass} value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">Choose a program…</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className={labelClass}>Starting period</label>
            <select className={inputClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Choose a period…</option>
              {periods?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button type="button" className={secondaryButtonClass} disabled={!programId || !periodId || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Submitting…" : "Submit application"}
          </button>
        </div>
        {submit.isError && <p className={`mt-1.5 ${errorTextClass}`}>{errorMessage(submit.error, "Couldn't submit that application.")}</p>}
      </div>
      <div className="space-y-3">
        {applications?.length === 0 && <p className="text-sm text-neutral-500">No applications yet.</p>}
        {applications?.map((app) => (
          <ApplicationCard key={app.id} containerId={containerId} application={app} programs={programs} onChanged={invalidate} />
        ))}
      </div>
    </div>
  );
}

function ApplicationCard({
  containerId, application, programs, onChanged,
}: { containerId: string; application: Application; programs: Program[]; onChanged: () => void }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [studentNumber, setStudentNumber] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);

  const startReview = useMutation({ mutationFn: () => sdk.educationAdmissions.applications(containerId).startReview(application.id), onSuccess: onChanged });
  const accept = useMutation({ mutationFn: () => sdk.educationAdmissions.applications(containerId).accept(application.id), onSuccess: onChanged });
  const reject = useMutation({
    mutationFn: () => sdk.educationAdmissions.applications(containerId).reject(application.id, rejectReason.trim()),
    onSuccess: () => { setShowReject(false); setRejectReason(""); onChanged(); },
  });
  const withdraw = useMutation({ mutationFn: () => sdk.educationAdmissions.applications(containerId).withdraw(application.id), onSuccess: onChanged });
  const enroll = useMutation({
    mutationFn: () => sdk.educationAdmissions.applications(containerId).enroll(application.id, studentNumber.trim()),
    onSuccess: () => { setShowEnroll(false); setStudentNumber(""); onChanged(); },
  });

  const programName = programs.find((p) => p.id === application.program_id)?.name ?? application.program_id;
  const canReview = application.status === "submitted";
  const canDecide = application.status === "submitted" || application.status === "under_review";
  const canEnroll = application.status === "accepted";

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">{programName}</div>
          <div className="mt-0.5 text-xs text-neutral-500">Submitted {formatDateTime(application.submitted_at)}</div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {application.status === "rejected" && application.decision_reason && (
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">Reason: {application.decision_reason}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canReview && (
          <button type="button" className={secondaryButtonClass} disabled={startReview.isPending} onClick={() => startReview.mutate()}>
            Start review
          </button>
        )}
        {canDecide && (
          <>
            <button type="button" className={secondaryButtonClass} disabled={accept.isPending} onClick={() => accept.mutate()}>Accept</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setShowReject((v) => !v)}>Reject</button>
            <button type="button" className={secondaryButtonClass} disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>Withdraw</button>
          </>
        )}
        {canEnroll && <button type="button" className={secondaryButtonClass} onClick={() => setShowEnroll((v) => !v)}>Enroll as student</button>}
      </div>

      {showReject && (
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <label className={labelClass}>Reason for rejection</label>
            <input className={inputClass} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <button type="button" className={secondaryButtonClass} disabled={!rejectReason.trim() || reject.isPending} onClick={() => reject.mutate()}>
            Confirm
          </button>
        </div>
      )}
      {reject.isError && <p className={`mt-1.5 ${errorTextClass}`}>{errorMessage(reject.error, "Couldn't reject that application.")}</p>}

      {showEnroll && (
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <label className={labelClass}>New student number</label>
            <input className={inputClass} value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="STU-0001" />
          </div>
          <button type="button" className={secondaryButtonClass} disabled={!studentNumber.trim() || enroll.isPending} onClick={() => enroll.mutate()}>
            Confirm
          </button>
        </div>
      )}
      {enroll.isError && <p className={`mt-1.5 ${errorTextClass}`}>{errorMessage(enroll.error, "Couldn't enroll this applicant.")}</p>}
      {application.status === "enrolled" && <p className="mt-2 text-xs text-neutral-500">Enrolled as student {application.enrolled_student_id}.</p>}
    </div>
  );
}
