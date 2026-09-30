import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  ClassOffering, CurriculumEntry, EnrollmentMode, Period, Program, Subject,
} from "../../../lib/sdk/domains/educationAcademic";
import {
  badgeClass, cardClass, errorMessage, errorTextClass, inputClass, labelClass, pillTabClass, primaryButtonClass,
  secondaryButtonClass, selectClass, StatusBadge,
} from "./ui";

type SubTab = "periods" | "programs" | "subjects" | "offerings";

export function SetupTab({ containerId }: { containerId: string }) {
  const [sub, setSub] = useState<SubTab>("periods");
  return (
    <div>
      <div className="flex gap-1.5">
        {([
          ["periods", "Periods"], ["programs", "Programs & Curriculum"], ["subjects", "Subjects"], ["offerings", "Class Offerings"],
        ] as [SubTab, string][]).map(([key, label]) => (
          <button key={key} type="button" className={pillTabClass(sub === key)} onClick={() => setSub(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {sub === "periods" && <PeriodsPanel containerId={containerId} />}
        {sub === "programs" && <ProgramsPanel containerId={containerId} />}
        {sub === "subjects" && <SubjectsPanel containerId={containerId} />}
        {sub === "offerings" && <OfferingsPanel containerId={containerId} />}
      </div>
    </div>
  );
}

// -- Periods ---------------------------------------------------------------------------------

function PeriodsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: periods, isLoading } = useQuery({ queryKey: ["edu-periods", containerId], queryFn: () => sdk.educationAcademic.periods(containerId).list() });
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-periods", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationAcademic.periods(containerId).create(name.trim(), startDate, endDate),
    onSuccess: () => { setName(""); setStartDate(""); setEndDate(""); invalidate(); },
  });
  const close = useMutation({ mutationFn: (id: string) => sdk.educationAcademic.periods(containerId).close(id), onSuccess: invalidate });
  const reopen = useMutation({ mutationFn: (id: string) => sdk.educationAcademic.periods(containerId).reopen(id), onSuccess: invalidate });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>Loading…</td></tr>}
            {periods?.length === 0 && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>No periods yet.</td></tr>}
            {periods?.map((p: Period) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{p.start_date} – {p.end_date}</td>
                <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-3 py-2 text-right">
                  {p.status === "open" ? (
                    <button type="button" className={secondaryButtonClass} disabled={close.isPending} onClick={() => close.mutate(p.id)}>Close</button>
                  ) : (
                    <button type="button" className={secondaryButtonClass} disabled={reopen.isPending} onClick={() => reopen.mutate(p.id)}>Reopen</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">New period</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Term 1, Fall 2026…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Start date</label>
              <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <button
            type="button" className={`w-full ${primaryButtonClass}`} disabled={!name.trim() || !startDate || !endDate || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create period"}
          </button>
          {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the period.")}</p>}
        </div>
      </div>
    </div>
  );
}

// -- Subjects ----------------------------------------------------------------------------------

function SubjectsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: subjects, isLoading } = useQuery({ queryKey: ["edu-subjects", containerId], queryFn: () => sdk.educationAcademic.subjects(containerId).list() });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-subjects", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationAcademic.subjects(containerId).create({ code: code.trim(), name: name.trim() }),
    onSuccess: () => { setCode(""); setName(""); invalidate(); },
  });
  const toggleActive = useMutation({
    mutationFn: (s: Subject) => (s.is_active ? sdk.educationAcademic.subjects(containerId).deactivate(s.id) : sdk.educationAcademic.subjects(containerId).activate(s.id)),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>Loading…</td></tr>}
            {subjects?.length === 0 && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>No subjects yet.</td></tr>}
            {subjects?.map((s: Subject) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{!s.is_active && <span className={badgeClass}>inactive</span>}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className={secondaryButtonClass} disabled={toggleActive.isPending} onClick={() => toggleActive.mutate(s)}>
                    {s.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">New subject</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Code</label>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" />
          </div>
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" />
          </div>
          <button type="button" className={`w-full ${primaryButtonClass}`} disabled={!code.trim() || !name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create subject"}
          </button>
          {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the subject.")}</p>}
        </div>
      </div>
    </div>
  );
}

// -- Programs & Curriculum ----------------------------------------------------------------------------

function ProgramsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: programs, isLoading } = useQuery({ queryKey: ["edu-programs", containerId], queryFn: () => sdk.educationAcademic.programs(containerId).list() });
  const [selected, setSelected] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creditBearing, setCreditBearing] = useState(false);
  const [mode, setMode] = useState<EnrollmentMode>("fixed_curriculum");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-programs", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationAcademic.programs(containerId).create({ code: code.trim(), name: name.trim(), credit_bearing: creditBearing, enrollment_mode: mode }),
    onSuccess: () => { setCode(""); setName(""); setCreditBearing(false); setMode("fixed_curriculum"); invalidate(); },
  });
  const toggleActive = useMutation({
    mutationFn: (p: Program) => (p.is_active ? sdk.educationAcademic.programs(containerId).deactivate(p.id) : sdk.educationAcademic.programs(containerId).activate(p.id)),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div>
        <div className={cardClass}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2" />
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-3 py-3 text-neutral-500" colSpan={5}>Loading…</td></tr>}
              {programs?.length === 0 && <tr><td className="px-3 py-3 text-neutral-500" colSpan={5}>No programs yet.</td></tr>}
              {programs?.map((p: Program) => (
                <tr
                  key={p.id} onClick={() => setSelected(p.id)}
                  className={`cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === p.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2 font-medium">{p.name}{p.credit_bearing && <span className={`ml-1.5 ${badgeClass}`}>credit-bearing</span>}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{p.enrollment_mode === "fixed_curriculum" ? "Fixed curriculum" : "Elective"}</td>
                  <td className="px-3 py-2">{!p.is_active && <span className={badgeClass}>inactive</span>}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button" className={secondaryButtonClass} disabled={toggleActive.isPending}
                      onClick={(e) => { e.stopPropagation(); toggleActive.mutate(p); }}
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && <div className="mt-4"><CurriculumPanel containerId={containerId} program={programs?.find((p: Program) => p.id === selected) ?? null} /></div>}
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New program</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Code</label>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="G5, CS…" />
          </div>
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 5, BSc Computer Science…" />
          </div>
          <div>
            <label className={labelClass}>Enrollment mode</label>
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as EnrollmentMode)}>
              <option value="fixed_curriculum">Fixed curriculum (K-12 style)</option>
              <option value="elective">Elective (university style)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={creditBearing} onChange={(e) => setCreditBearing(e.target.checked)} />
            Credit-bearing
          </label>
          <button type="button" className={`w-full ${primaryButtonClass}`} disabled={!code.trim() || !name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create program"}
          </button>
          {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the program.")}</p>}
        </div>
      </div>
    </div>
  );
}

function CurriculumPanel({ containerId, program }: { containerId: string; program: Program | null }) {
  const queryClient = useQueryClient();
  const { data: entries } = useQuery({
    queryKey: ["edu-curriculum", containerId, program?.id],
    queryFn: () => sdk.educationAcademic.curriculum(containerId).list(program!.id),
    enabled: !!program,
  });
  const { data: subjects } = useQuery({ queryKey: ["edu-subjects", containerId], queryFn: () => sdk.educationAcademic.subjects(containerId).list() });
  const [subjectId, setSubjectId] = useState("");
  const [creditValue, setCreditValue] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-curriculum", containerId, program?.id] });
  const add = useMutation({
    mutationFn: () =>
      sdk.educationAcademic.curriculum(containerId).add(program!.id, {
        subject_id: subjectId, credit_value: program?.credit_bearing ? Number(creditValue) : null,
      }),
    onSuccess: () => { setSubjectId(""); setCreditValue(""); invalidate(); },
  });
  const remove = useMutation({ mutationFn: (subjId: string) => sdk.educationAcademic.curriculum(containerId).remove(program!.id, subjId), onSuccess: invalidate });

  const subjectName = (id: string) => subjects?.find((s: Subject) => s.id === id)?.name ?? id;

  if (!program) return null;
  return (
    <div className={`${cardClass} p-4`}>
      <h3 className="text-sm font-semibold">{program.name}'s curriculum</h3>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="py-1.5 font-medium">Subject</th>
            {program.credit_bearing && <th className="py-1.5 font-medium">Credits</th>}
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {entries?.length === 0 && <tr><td className="py-2 text-neutral-500" colSpan={3}>No subjects in this curriculum yet.</td></tr>}
          {entries?.map((e: CurriculumEntry) => (
            <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="py-1.5">{subjectName(e.subject_id)}</td>
              {program.credit_bearing && <td className="py-1.5">{e.credit_value}</td>}
              <td className="py-1.5 text-right">
                <button type="button" className={secondaryButtonClass} disabled={remove.isPending} onClick={() => remove.mutate(e.subject_id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Add subject</label>
          <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Choose a subject…</option>
            {subjects?.filter((s: Subject) => !entries?.some((e: CurriculumEntry) => e.subject_id === s.id)).map((s: Subject) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {program.credit_bearing && (
          <div className="w-24">
            <label className={labelClass}>Credits</label>
            <input type="number" min={1} className={inputClass} value={creditValue} onChange={(e) => setCreditValue(e.target.value)} />
          </div>
        )}
        <button
          type="button" className={secondaryButtonClass} disabled={!subjectId || (program.credit_bearing && !creditValue) || add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </button>
      </div>
      {add.isError && <p className={`mt-1.5 ${errorTextClass}`}>{errorMessage(add.error, "Couldn't add that subject.")}</p>}
    </div>
  );
}

// -- Class Offerings ------------------------------------------------------------------------------------

function OfferingsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: periods } = useQuery({ queryKey: ["edu-periods", containerId], queryFn: () => sdk.educationAcademic.periods(containerId).list() });
  const { data: programs } = useQuery({ queryKey: ["edu-programs", containerId], queryFn: () => sdk.educationAcademic.programs(containerId).list() });
  const [periodId, setPeriodId] = useState("");
  const [programId, setProgramId] = useState("");
  const { data: subjectsInCurriculum } = useQuery({
    queryKey: ["edu-curriculum", containerId, programId],
    queryFn: () => sdk.educationAcademic.curriculum(containerId).list(programId),
    enabled: !!programId,
  });
  const { data: allSubjects } = useQuery({ queryKey: ["edu-subjects", containerId], queryFn: () => sdk.educationAcademic.subjects(containerId).list() });
  const { data: offerings, isLoading } = useQuery({
    queryKey: ["edu-offerings", containerId, periodId, programId],
    queryFn: () => sdk.educationAcademic.classOfferings(containerId).list({ period_id: periodId || undefined, program_id: programId || undefined }),
  });

  const [subjectId, setSubjectId] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [capacity, setCapacity] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["edu-offerings", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.educationAcademic.classOfferings(containerId).create({
        period_id: periodId, program_id: programId, subject_id: subjectId, section_label: sectionLabel.trim() || undefined,
        capacity: capacity ? Number(capacity) : null,
      }),
    onSuccess: () => { setSubjectId(""); setSectionLabel(""); setCapacity(""); invalidate(); },
  });

  const subjectName = (id: string) => allSubjects?.find((s: Subject) => s.id === id)?.name ?? id;
  const programName = (id: string) => programs?.find((p: Program) => p.id === id)?.name ?? id;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div>
        <div className="flex gap-2">
          <select className={`${selectClass} max-w-xs`} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">All periods</option>
            {periods?.map((p: Period) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={`${selectClass} max-w-xs`} value={programId} onChange={(e) => { setProgramId(e.target.value); setSubjectId(""); }}>
            <option value="">All programs</option>
            {programs?.map((p: Program) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className={`mt-3 ${cardClass}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Program</th>
                <th className="px-3 py-2 font-medium">Section</th>
                <th className="px-3 py-2 font-medium">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>Loading…</td></tr>}
              {offerings?.length === 0 && <tr><td className="px-3 py-3 text-neutral-500" colSpan={4}>No class offerings match this filter.</td></tr>}
              {offerings?.map((o: ClassOffering) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="px-3 py-2 font-medium">{subjectName(o.subject_id)}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{programName(o.program_id)}</td>
                  <td className="px-3 py-2">{o.section_label || "—"}</td>
                  <td className="px-3 py-2">{o.capacity ?? "Unlimited"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New class offering</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Period</label>
            <select className={inputClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Choose a period…</option>
              {periods?.map((p: Period) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Program</label>
            <select className={inputClass} value={programId} onChange={(e) => { setProgramId(e.target.value); setSubjectId(""); }}>
              <option value="">Choose a program…</option>
              {programs?.map((p: Program) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Subject (from the program's curriculum)</label>
            <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!programId}>
              <option value="">Choose a subject…</option>
              {subjectsInCurriculum?.map((e: CurriculumEntry) => <option key={e.subject_id} value={e.subject_id}>{subjectName(e.subject_id)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Section label</label>
              <input className={inputClass} value={sectionLabel} onChange={(e) => setSectionLabel(e.target.value)} placeholder="A, 5B…" />
            </div>
            <div>
              <label className={labelClass}>Capacity</label>
              <input type="number" min={1} className={inputClass} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          <button
            type="button" className={`w-full ${primaryButtonClass}`} disabled={!periodId || !programId || !subjectId || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create class offering"}
          </button>
          {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the class offering.")}</p>}
        </div>
      </div>
    </div>
  );
}
