import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Admin → Questionnaires. Author reusable questionnaires with typed questions.
 * These are referenced by instantiation rules (and anything else that needs a
 * form). A questionnaire here becomes a `questionnaire` pre-condition on a
 * template/kind — the user must complete it before their instantiation request.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

const QUESTION_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "single_choice", label: "Single choice" },
  { value: "multi_choice", label: "Multiple choice" },
  { value: "boolean", label: "Yes / No" },
  { value: "number", label: "Number" },
  { value: "file", label: "File upload" },
];

type Question = {
  prompt: string;
  type: string;
  help_text?: string;
  options?: { value: string; label: string }[];
  is_required: boolean;
};

export function QuestionnairesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["questionnaires"],
    queryFn: () => api("GET", "questionnaires"),
  });
  const rows: any[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-black dark:text-white m-0">
          Questionnaires
        </h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + New questionnaire
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Reusable forms. Attach one to a container kind or template as a
        pre-condition — users complete it before their instantiation request.
      </p>

      {creating && (
        <QuestionnaireForm
          onDone={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["questionnaires"] });
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">No questionnaires yet.</p>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {rows.map((qn) => (
            <div
              key={qn.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p className="text-sm font-semibold text-black dark:text-white m-0">
                {qn.name}{" "}
                <span className="text-[11px] font-normal text-neutral-400">
                  ({qn.code})
                </span>
              </p>
              {qn.description && (
                <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                  {qn.description}
                </p>
              )}
              <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-600 mt-1 m-0">
                {qn.id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionnaireForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const addQ = () =>
    setQuestions((p) => [
      ...p,
      { prompt: "", type: "short_text", is_required: true },
    ]);
  const setQ = (i: number, patch: Partial<Question>) =>
    setQuestions((p) => p.map((q, qi) => (qi === i ? { ...q, ...patch } : q)));
  const delQ = (i: number) =>
    setQuestions((p) => p.filter((_, qi) => qi !== i));

  const save = useMutation({
    mutationFn: () =>
      api("POST", "questionnaires", {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          help_text: q.help_text || undefined,
          options: ["single_choice", "multi_choice"].includes(q.type)
            ? q.options
            : undefined,
          is_required: q.is_required,
        })),
      }),
    onSuccess: onDone,
    onError: (e: Error) => setMsg(e.message),
  });

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        New questionnaire
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-neutral-400 block mb-0.5">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Eligibility form"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-400 block mb-0.5">
            Code
          </label>
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
            }
            className={inputCls}
            placeholder="eligibility"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="text-[11px] text-neutral-400 block mb-0.5">
          Description
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Optional"
        />
      </div>

      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0 mb-2">
        Questions
      </p>
      <div className="space-y-3 mb-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3"
          >
            <div className="flex items-start gap-2 mb-2">
              <input
                value={q.prompt}
                onChange={(e) => setQ(i, { prompt: e.target.value })}
                placeholder="Question prompt"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={() => delQ(i)}
                className="text-[11px] text-red-500 hover:text-red-600 mt-2"
              >
                remove
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={q.type}
                onChange={(e) => setQ(i, { type: e.target.value })}
                className="px-2 py-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <input
                  type="checkbox"
                  checked={q.is_required}
                  onChange={(e) => setQ(i, { is_required: e.target.checked })}
                />
                Required
              </label>
            </div>
            {["single_choice", "multi_choice"].includes(q.type) && (
              <OptionsEditor
                options={q.options ?? []}
                onChange={(opts) => setQ(i, { options: opts })}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addQ}
        className="text-[11px] text-neutral-500 hover:text-neutral-700 underline mb-4 block"
      >
        + add question
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={
            save.isPending ||
            !name.trim() ||
            !code.trim() ||
            questions.length === 0
          }
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Create questionnaire"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600"
        >
          Cancel
        </button>
        {msg && <span className="text-[11px] text-red-600">{msg}</span>}
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: { value: string; label: string }[];
  onChange: (o: { value: string; label: string }[]) => void;
}) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    onChange([
      ...options,
      {
        value: text.trim().toLowerCase().replace(/\s+/g, "_"),
        label: text.trim(),
      },
    ]);
    setText("");
  };
  return (
    <div className="mt-2 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-wrap gap-1 mb-1">
        {options.map((o, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
          >
            {o.label}
            <button
              onClick={() => onChange(options.filter((_, oi) => oi !== i))}
              className="text-neutral-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add option"
          className="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <button
          onClick={add}
          className="px-2 py-1 text-[11px] font-semibold rounded border border-neutral-300 dark:border-neutral-700"
        >
          add
        </button>
      </div>
    </div>
  );
}
