import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { AssessmentComponent, GradeBand } from "../../../lib/sdk/domains/educationAssessment";
import type { Period, Program } from "../../../lib/sdk/domains/educationAcademic";
import { cardClass, errorMessage, errorTextClass, inputClass, labelClass, pillTabClass, primaryButtonClass, secondaryButtonClass } from "./ui";

type SubTab = "gradebook" | "scales";

export function GradingTab({ containerId }: { containerId: string }) {
  const [sub, setSub] = useState<SubTab>("gradebook");
  return (
    <div>
      <div className="flex gap-1.5">
        {([["gradebook", "Gradebook"], ["scales", "Grading Scales"]] as [SubTab, string][]).map(([key, label]) => (
          <button key={key} type="button" className={pillTabClass(sub === key)} onClick={() => setSub(key)}>{label}</button>
        ))}
      </div>
      <div className="mt-4">
        {sub === "gradebook" && <GradebookPanel containerId={containerId} />}
        {sub === "scales" && <ScalesPanel containerId={containerId} />}
      </div>
    </div>
  );
}

// -- Gradebook -----------------------------------------------------------------------------------

function GradebookPanel({ containerId }: { containerId: string }) {
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
      </div>
      <div className="mt-4">
        {offeringId ? <Gradebook containerId={containerId} classOfferingId={offeringId} /> : <p className="text-sm text-neutral-500">Choose a class to see its gradebook.</p>}
      </div>
    </div>
  );
}

function Gradebook({ containerId, classOfferingId }: { containerId: string; classOfferingId: string }) {
  const queryClient = useQueryClient();
  const { data: components } = useQuery({
    queryKey: ["asmt-components", containerId, classOfferingId],
    queryFn: () => sdk.educationAssessment.components(containerId).list(classOfferingId, true),
  });
  const { data: roster } = useQuery({
    queryKey: ["edu-roster", containerId, classOfferingId],
    queryFn: () => sdk.educationEnrollment.roster(containerId).forOffering(classOfferingId),
  });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("assignment");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("1");

  const invalidateComponents = () => queryClient.invalidateQueries({ queryKey: ["asmt-components", containerId, classOfferingId] });
  const createComponent = useMutation({
    mutationFn: () =>
      sdk.educationAssessment.components(containerId).create(classOfferingId, { name: name.trim(), category: category.trim(), max_score: Number(maxScore), weight: Number(weight) }),
    onSuccess: () => { setName(""); setCategory("assignment"); setMaxScore("100"); setWeight("1"); invalidateComponents(); },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <div>
        <div className={cardClass}>
          {components?.length === 0 && <p className="p-3 text-sm text-neutral-500">No gradable components yet.</p>}
          {components?.map((c: AssessmentComponent) => (
            <button
              key={c.id} type="button" onClick={() => setSelectedComponent(c.id)}
              className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selectedComponent === c.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-neutral-500">{c.category} · out of {c.max_score} · weight {c.weight}</div>
            </button>
          ))}
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New component</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Midterm, Quiz 1…" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="assignment, quiz, exam…" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Max score</label>
                <input type="number" min={1} className={inputClass} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Weight</label>
                <input type="number" min={0.01} step={0.01} className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
            <button type="button" className={`w-full ${primaryButtonClass}`} disabled={!name.trim() || createComponent.isPending} onClick={() => createComponent.mutate()}>
              {createComponent.isPending ? "Creating…" : "Create component"}
            </button>
            {createComponent.isError && <p className={errorTextClass}>{errorMessage(createComponent.error, "Couldn't create the component.")}</p>}
          </div>
        </div>
      </div>
      <div>
        {selectedComponent ? (
          <ComponentScores containerId={containerId} componentId={selectedComponent} roster={roster ?? []} />
        ) : (
          <ClassGrades containerId={containerId} classOfferingId={classOfferingId} roster={roster ?? []} />
        )}
      </div>
    </div>
  );
}

function ComponentScores({
  containerId, componentId, roster,
}: { containerId: string; componentId: string; roster: { class_enrollment_id: string; student_name: string; student_number: string }[] }) {
  const queryClient = useQueryClient();
  const { data: existingScores } = useQuery({
    queryKey: ["asmt-scores-for-component", containerId, componentId],
    queryFn: () => sdk.educationAssessment.scores(containerId).forComponent(componentId),
  });
  const [values, setValues] = useState<Record<string, string>>({});

  const valueFor = (classEnrollmentId: string) =>
    values[classEnrollmentId] ?? existingScores?.find((s) => s.class_enrollment_id === classEnrollmentId)?.score_value.toString() ?? "";

  const save = useMutation({
    mutationFn: () =>
      sdk.educationAssessment.scores(containerId).recordBulk(
        componentId,
        roster
          .filter((r) => valueFor(r.class_enrollment_id) !== "")
          .map((r) => ({ class_enrollment_id: r.class_enrollment_id, score_value: Number(valueFor(r.class_enrollment_id)) })),
      ),
    onSuccess: () => {
      setValues({});
      queryClient.invalidateQueries({ queryKey: ["asmt-scores-for-component", containerId, componentId] });
    },
  });

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {roster.length === 0 && <tr><td className="px-3 py-3 text-neutral-500" colSpan={2}>No students enrolled in this class.</td></tr>}
          {roster.map((r) => (
            <tr key={r.class_enrollment_id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="px-3 py-2">
                <div className="font-medium">{r.student_name}</div>
                <div className="font-mono text-xs text-neutral-500">{r.student_number}</div>
              </td>
              <td className="px-3 py-2">
                <input
                  type="number" className={`${inputClass} w-24`} value={valueFor(r.class_enrollment_id)}
                  onChange={(e) => setValues((prev) => ({ ...prev, [r.class_enrollment_id]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-neutral-200 p-3 dark:border-neutral-800">
        {save.isError ? <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save scores.")}</p> : <span />}
        <button type="button" className={primaryButtonClass} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save scores"}
        </button>
      </div>
    </div>
  );
}

function ClassGrades({
  containerId, classOfferingId, roster,
}: { containerId: string; classOfferingId: string; roster: { class_enrollment_id: string; student_name: string; student_number: string }[] }) {
  if (roster.length === 0) {
    return <p className="text-sm text-neutral-500">No students enrolled in this class yet.</p>;
  }
  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Grade</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((r) => (
            <StudentGradeRow key={r.class_enrollment_id} containerId={containerId} classOfferingId={classOfferingId} entry={r} />
          ))}
        </tbody>
      </table>
      <p className="border-t border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-800">Select a component on the left to enter scores for it.</p>
    </div>
  );
}

function StudentGradeRow({
  containerId, classOfferingId, entry,
}: { containerId: string; classOfferingId: string; entry: { class_enrollment_id: string; student_name: string; student_number: string } }) {
  const { data: grade } = useQuery({
    queryKey: ["asmt-grade", containerId, classOfferingId, entry.class_enrollment_id],
    queryFn: () => sdk.educationAssessment.grades(containerId).compute(classOfferingId, entry.class_enrollment_id),
    retry: false,
  });
  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
      <td className="px-3 py-2">
        <div className="font-medium">{entry.student_name}</div>
        <div className="font-mono text-xs text-neutral-500">{entry.student_number}</div>
      </td>
      <td className="px-3 py-2">
        {grade ? (
          <span>
            {grade.percentage}%{grade.letter ? ` — ${grade.letter}` : ""}{grade.gpa_points !== null ? ` (${grade.gpa_points} GPA)` : ""}
          </span>
        ) : (
          <span className="text-neutral-500">Not graded yet</span>
        )}
      </td>
    </tr>
  );
}

// -- Grading Scales -----------------------------------------------------------------------------

function ScalesPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: scales, isLoading } = useQuery({ queryKey: ["asmt-scales", containerId], queryFn: () => sdk.educationAssessment.gradingScales(containerId).list() });
  const [name, setName] = useState("");
  const [bands, setBands] = useState<GradeBand[]>([{ min_percent: 0, max_percent: 100, letter: "", gpa_points: null }]);
  const [isDefault, setIsDefault] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["asmt-scales", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.educationAssessment.gradingScales(containerId).create({ name: name.trim(), bands, is_default: isDefault }),
    onSuccess: () => { setName(""); setBands([{ min_percent: 0, max_percent: 100, letter: "", gpa_points: null }]); setIsDefault(false); invalidate(); },
  });
  const setDefault = useMutation({ mutationFn: (id: string) => sdk.educationAssessment.gradingScales(containerId).setDefault(id), onSuccess: invalidate });

  const updateBand = (i: number, changes: Partial<GradeBand>) => setBands((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...changes } : b)));
  const addBand = () => setBands((prev) => [...prev, { min_percent: 0, max_percent: 0, letter: "", gpa_points: null }]);
  const removeBand = (i: number) => setBands((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_24rem]">
      <div className={cardClass}>
        {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
        {scales?.length === 0 && <p className="p-3 text-sm text-neutral-500">No grading scales yet.</p>}
        {scales?.map((s) => (
          <div key={s.id} className="border-b border-neutral-100 p-4 last:border-0 dark:border-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{s.name}</h3>
              {s.is_default ? (
                <span className="text-xs text-neutral-500">Default</span>
              ) : (
                <button type="button" className={secondaryButtonClass} disabled={setDefault.isPending} onClick={() => setDefault.mutate(s.id)}>Make default</button>
              )}
            </div>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {s.bands.map((b, i) => (
                  <tr key={i} className="border-b border-neutral-50 last:border-0 dark:border-neutral-900/50">
                    <td className="py-1 text-neutral-600 dark:text-neutral-400">{b.min_percent}–{b.max_percent}%</td>
                    <td className="py-1 font-medium">{b.letter}</td>
                    <td className="py-1 text-neutral-600 dark:text-neutral-400">{b.gpa_points !== null ? `${b.gpa_points} GPA` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New grading scale</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="4.0 Scale, Division System…" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Bands (must cover 0–100 with no gaps)</label>
            {bands.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input type="number" className={`${inputClass} w-16`} value={b.min_percent} onChange={(e) => updateBand(i, { min_percent: Number(e.target.value) })} placeholder="Min" />
                <span className="text-xs text-neutral-500">–</span>
                <input type="number" className={`${inputClass} w-16`} value={b.max_percent} onChange={(e) => updateBand(i, { max_percent: Number(e.target.value) })} placeholder="Max" />
                <input className={`${inputClass} w-14`} value={b.letter} onChange={(e) => updateBand(i, { letter: e.target.value })} placeholder="A" />
                <input
                  type="number" step={0.1} className={`${inputClass} w-16`} value={b.gpa_points ?? ""}
                  onChange={(e) => updateBand(i, { gpa_points: e.target.value === "" ? null : Number(e.target.value) })} placeholder="GPA"
                />
                <button type="button" className={secondaryButtonClass} onClick={() => removeBand(i)}>✕</button>
              </div>
            ))}
            <button type="button" className={secondaryButtonClass} onClick={addBand}>+ Add band</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Make this the default scale
          </label>
          <button
            type="button" className={`w-full ${primaryButtonClass}`} disabled={!name.trim() || bands.some((b) => !b.letter.trim()) || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create grading scale"}
          </button>
          {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the grading scale.")}</p>}
        </div>
      </div>
    </div>
  );
}
