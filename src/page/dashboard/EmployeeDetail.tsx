import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type { Employment, EmploymentType, ProficiencyLevel, WorkingArrangement } from "../../lib/sdk/domains/hr";
 
/**
 * One employee's own page — mirrors ProjectDetail's role in
 * capabilities.core.projects: the deep page where employment
 * lifecycle, leave, compensation, performance, and everything else
 * converges for one specific person. Container-level catalogs (jobs,
 * leave types, benefit plans, ...) live on HRDashboard's own tabs.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

export function EmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [selectedEmploymentId, setSelectedEmploymentId] = useState<string | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["hr", "employee", employeeId],
    queryFn: () => sdk.hr.getEmployee(employeeId!),
    enabled: Boolean(employeeId),
  });

  const { data: employments } = useQuery({
    queryKey: ["hr", "employments", employeeId],
    queryFn: () => sdk.hr.listEmploymentsForEmployee(employeeId!),
    enabled: Boolean(employeeId),
  });

  const { data: skills } = useQuery({
    queryKey: ["hr", "employee-skills", employeeId],
    queryFn: () => sdk.hr.listEmployeeSkills(employeeId!),
    enabled: Boolean(employeeId),
  });

  const { data: certifications } = useQuery({
    queryKey: ["hr", "certifications", employeeId],
    queryFn: () => sdk.hr.listCertifications(employeeId!),
    enabled: Boolean(employeeId),
  });

  if (!employeeId) return null;
  if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>;
  if (!employee) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Employee not found.</p>;

  const activeEmployment = employments?.find((e) => e.id === selectedEmploymentId) ?? employments?.[0];

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">{employee.employee_number}</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {employee.personal_email}
        {employee.phone && ` · ${employee.phone}`}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <EmploymentsSection
            employeeId={employeeId}
            employments={employments ?? []}
            selectedEmploymentId={activeEmployment?.id ?? null}
            onSelect={setSelectedEmploymentId}
          />
          {activeEmployment && <EmploymentDetailSection employment={activeEmployment} />}
        </div>
        <div className="flex flex-col gap-4">
          <SkillsSection employeeId={employeeId} skills={skills ?? []} />
          <CertificationsSection employeeId={employeeId} certifications={certifications ?? []} />
        </div>
      </div>
    </div>
  );
}

function EmploymentsSection({
  employeeId,
  employments,
  selectedEmploymentId,
  onSelect,
}: {
  employeeId: string;
  employments: Employment[];
  selectedEmploymentId: string | null;
  onSelect: (id: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Employments</p>
        <button type="button" onClick={() => setShowCreate((v) => !v)} className={secondaryButtonClass}>
          {showCreate ? "Cancel" : "+ New"}
        </button>
      </div>
      {showCreate && <CreateEmploymentForm employeeId={employeeId} onDone={() => setShowCreate(false)} />}
      <ul className="mt-2 flex flex-col gap-1">
        {employments.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSelect(e.id)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                selectedEmploymentId === e.id
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              }`}
            >
              {e.employment_type} · {e.status}
            </button>
          </li>
        ))}
        {employments.length === 0 && !showCreate && (
          <li className="text-xs text-neutral-500 dark:text-neutral-500">No employments yet.</li>
        )}
      </ul>
    </div>
  );
}

function CreateEmploymentForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [positionId, setPositionId] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [workingArrangement, setWorkingArrangement] = useState<WorkingArrangement>("onsite");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createEmployment(employeeId, {
        position_id: positionId,
        employment_type: employmentType,
        working_arrangement: workingArrangement,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employments", employeeId] });
      onDone();
    },
  });

  return (
    <div className="mt-2 flex flex-col gap-2">
      <input className={`${inputClass} text-xs`} placeholder="Position id…" value={positionId} onChange={(e) => setPositionId(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={`${inputClass} text-xs`} value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
        <select className={`${inputClass} text-xs`} value={workingArrangement} onChange={(e) => setWorkingArrangement(e.target.value as WorkingArrangement)}>
          <option value="onsite">Onsite</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <button type="button" onClick={() => mutation.mutate()} disabled={!positionId.trim() || mutation.isPending} className={secondaryButtonClass}>
        {mutation.isPending ? "Creating…" : "Create"}
      </button>
      {mutation.isError && <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this employment.</p>}
    </div>
  );
}

function EmploymentDetailSection({ employment }: { employment: Employment }) {
  const [section, setSection] = useState<
    "leave" | "compensation" | "benefits" | "performance" | "training" | "warnings" | "roles" | "history"
  >("leave");

  const SECTIONS: { key: typeof section; label: string }[] = [
    { key: "leave", label: "Leave" },
    { key: "compensation", label: "Compensation" },
    { key: "benefits", label: "Benefits" },
    { key: "performance", label: "Performance" },
    { key: "training", label: "Training" },
    { key: "warnings", label: "Warnings" },
    { key: "roles", label: "Roles" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              section === s.key
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {section === "leave" && <LeaveSection employmentId={employment.id} />}
        {section === "compensation" && <CompensationSection employmentId={employment.id} />}
        {section === "benefits" && <BenefitsSection employmentId={employment.id} />}
        {section === "performance" && <PerformanceSection employmentId={employment.id} />}
        {section === "training" && <TrainingSection employmentId={employment.id} />}
        {section === "warnings" && <WarningsSection employmentId={employment.id} />}
        {section === "roles" && <RoleGrantsSection employmentId={employment.id} />}
        {section === "history" && <HistorySection employmentId={employment.id} />}
      </div>
    </div>
  );
}

function LeaveSection({ employmentId }: { employmentId: string }) {
  const { data: balances } = useQuery({
    queryKey: ["hr", "leave-balances", employmentId],
    queryFn: () => sdk.hr.listLeaveBalances(employmentId),
  });
  const { data: records } = useQuery({
    queryKey: ["hr", "leave-records", employmentId],
    queryFn: () => sdk.hr.listLeaveRecords(employmentId),
  });

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div>
        <p className="font-medium text-neutral-600 dark:text-neutral-400">Balances</p>
        {balances?.map((b) => (
          <p key={b.id} className="mt-1 text-neutral-500 dark:text-neutral-500">
            {b.leave_type_id.slice(0, 8)}: {b.remaining_days}/{b.allocated_days} days remaining ({b.year})
          </p>
        ))}
        {balances?.length === 0 && <p className="mt-1 text-neutral-400 dark:text-neutral-600">No balances set.</p>}
      </div>
      <div>
        <p className="font-medium text-neutral-600 dark:text-neutral-400">Records</p>
        {records?.map((r) => (
          <p key={r.id} className="mt-1 text-neutral-500 dark:text-neutral-500">
            {r.start_date} → {r.end_date} · {r.days} days · {r.status}
          </p>
        ))}
        {records?.length === 0 && <p className="mt-1 text-neutral-400 dark:text-neutral-600">No leave taken.</p>}
      </div>
    </div>
  );
}

function CompensationSection({ employmentId }: { employmentId: string }) {
  const { data: current } = useQuery({
    queryKey: ["hr", "compensation-current", employmentId],
    queryFn: () => sdk.hr.getCurrentCompensation(employmentId),
  });

  return (
    <div className="text-xs">
      {current ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          {current.base_salary_currency} {(current.base_salary_amount / 100).toFixed(2)} / {current.pay_frequency}
        </p>
      ) : (
        <p className="text-neutral-400 dark:text-neutral-600">No compensation record set.</p>
      )}
    </div>
  );
}

function BenefitsSection({ employmentId }: { employmentId: string }) {
  const { data: enrollments } = useQuery({
    queryKey: ["hr", "benefit-enrollments", employmentId],
    queryFn: () => sdk.hr.listBenefitEnrollments(employmentId),
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      {enrollments?.map((e) => (
        <p key={e.id} className="text-neutral-500 dark:text-neutral-500">
          {e.benefit_plan_id.slice(0, 8)} · {e.status}
        </p>
      ))}
      {enrollments?.length === 0 && <p className="text-neutral-400 dark:text-neutral-600">No benefit enrollments.</p>}
    </div>
  );
}

function PerformanceSection({ employmentId }: { employmentId: string }) {
  const { data: reviews } = useQuery({
    queryKey: ["hr", "reviews", employmentId],
    queryFn: () => sdk.hr.listReviewsForEmployment(employmentId),
  });
  const { data: pips } = useQuery({
    queryKey: ["hr", "pips", employmentId],
    queryFn: () => sdk.hr.listPipsForEmployment(employmentId),
  });

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div>
        <p className="font-medium text-neutral-600 dark:text-neutral-400">Reviews</p>
        {reviews?.map((r) => (
          <p key={r.id} className="mt-1 text-neutral-500 dark:text-neutral-500">
            {r.review_type} · {r.status} {r.overall_rating != null && `· ${r.overall_rating}★`}
          </p>
        ))}
        {reviews?.length === 0 && <p className="mt-1 text-neutral-400 dark:text-neutral-600">No reviews yet.</p>}
      </div>
      {pips && pips.length > 0 && (
        <div>
          <p className="font-medium text-neutral-600 dark:text-neutral-400">Improvement plans</p>
          {pips.map((p) => (
            <p key={p.id} className="mt-1 text-neutral-500 dark:text-neutral-500">{p.reason} · {p.status}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingSection({ employmentId }: { employmentId: string }) {
  const { data: enrollments } = useQuery({
    queryKey: ["hr", "training-enrollments", employmentId],
    queryFn: () => sdk.hr.listTrainingEnrollments(employmentId),
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      {enrollments?.map((e) => (
        <p key={e.id} className="text-neutral-500 dark:text-neutral-500">
          {e.training_program_id.slice(0, 8)} · {e.status}{e.score != null && ` · ${e.score}`}
        </p>
      ))}
      {enrollments?.length === 0 && <p className="text-neutral-400 dark:text-neutral-600">No training enrollments.</p>}
    </div>
  );
}

function WarningsSection({ employmentId }: { employmentId: string }) {
  const { data: warnings } = useQuery({
    queryKey: ["hr", "warnings", employmentId],
    queryFn: () => sdk.hr.listWarningsForEmployment(employmentId),
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      {warnings?.map((w) => (
        <p key={w.id} className="text-neutral-500 dark:text-neutral-500">
          {w.warning_type} · {w.reason}
        </p>
      ))}
      {warnings?.length === 0 && <p className="text-neutral-400 dark:text-neutral-600">No warnings on record.</p>}
    </div>
  );
}

function RoleGrantsSection({ employmentId }: { employmentId: string }) {
  const { data: grants } = useQuery({
    queryKey: ["hr", "employment-role-grants", employmentId],
    queryFn: () => sdk.hr.listEmploymentRoleGrants(employmentId),
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
        Granted automatically from this employment's own position — see the position's own
        role grants to change what gets granted.
      </p>
      {grants?.map((g) => (
        <p key={g.id} className="mt-1 text-neutral-500 dark:text-neutral-500">
          {g.position_role_grant_id.slice(0, 8)} · {g.status}
          {g.revoked_at && ` · revoked ${g.revoked_at}`}
        </p>
      ))}
      {grants?.length === 0 && <p className="mt-1 text-neutral-400 dark:text-neutral-600">No role grants on record.</p>}
    </div>
  );
}

function HistorySection({ employmentId }: { employmentId: string }) {
  const { data: history } = useQuery({
    queryKey: ["hr", "history", employmentId],
    queryFn: () => sdk.hr.listEmploymentHistory(employmentId),
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      {history?.map((h) => (
        <p key={h.id} className="text-neutral-500 dark:text-neutral-500">
          {h.effective_date} · {h.event_type.replace(/_/g, " ")}
        </p>
      ))}
      {history?.length === 0 && <p className="text-neutral-400 dark:text-neutral-600">No history recorded.</p>}
    </div>
  );
}

function SkillsSection({ employeeId, skills }: { employeeId: string; skills: { id: string; skill_id: string; proficiency_level: ProficiencyLevel }[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [skillId, setSkillId] = useState("");
  const [proficiency, setProficiency] = useState<ProficiencyLevel>("intermediate");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => sdk.hr.addEmployeeSkill(employeeId, { skill_id: skillId, proficiency_level: proficiency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employee-skills", employeeId] });
      setSkillId("");
      setShowAdd(false);
    },
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Skills</p>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className={secondaryButtonClass}>
          <Plus size={13} />
        </button>
      </div>
      {showAdd && (
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputClass} text-xs`} placeholder="Skill id…" value={skillId} onChange={(e) => setSkillId(e.target.value)} />
          <select className={`${inputClass} text-xs`} value={proficiency} onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          <button type="button" onClick={() => mutation.mutate()} disabled={!skillId.trim() || mutation.isPending} className={`flex-none ${secondaryButtonClass}`}>
            Add
          </button>
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {skills.map((s) => (
          <li key={s.id} className="text-neutral-500 dark:text-neutral-500">
            {s.skill_id.slice(0, 8)} · {s.proficiency_level}
          </li>
        ))}
        {skills.length === 0 && <li className="text-neutral-400 dark:text-neutral-600">No skills recorded.</li>}
      </ul>
    </div>
  );
}

function CertificationsSection({ employeeId, certifications }: { employeeId: string; certifications: { id: string; name: string; issuing_body: string }[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => sdk.hr.createCertification(employeeId, { name, issuing_body: issuingBody || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "certifications", employeeId] });
      setName("");
      setIssuingBody("");
      setShowAdd(false);
    },
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Certifications</p>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className={secondaryButtonClass}>
          <Plus size={13} />
        </button>
      </div>
      {showAdd && (
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputClass} text-xs`} placeholder="Name…" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${inputClass} text-xs`} placeholder="Issuing body…" value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
          <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} className={`flex-none ${secondaryButtonClass}`}>
            Add
          </button>
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {certifications.map((c) => (
          <li key={c.id} className="text-neutral-500 dark:text-neutral-500">
            {c.name}{c.issuing_body && ` · ${c.issuing_body}`}
          </li>
        ))}
        {certifications.length === 0 && <li className="text-neutral-400 dark:text-neutral-600">No certifications recorded.</li>}
      </ul>
    </div>
  );
}
