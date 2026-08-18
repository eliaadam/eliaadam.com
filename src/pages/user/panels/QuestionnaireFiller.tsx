import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

/*
 * QuestionnaireFiller — renders a questionnaire for a user to answer and submit.
 * Used inside the instantiation-request flow: the user completes the required
 * questionnaire, and the resulting response_id is attached to their request.
 *
 * On submit it calls onSubmitted(responseId) so the parent can carry that id
 * into the instantiation request.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

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

type Question = {
  id: string;
  prompt: string;
  help_text?: string;
  type: string;
  options?: { value: string; label: string }[];
  is_required: boolean;
};

export function QuestionnaireFiller({
  questionnaireId,
  contextType,
  contextId,
  onSubmitted,
}: {
  questionnaireId: string;
  contextType?: string;
  contextId?: string;
  onSubmitted: (responseId: string) => void;
}) {
  const [responseId, setResponseId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const qQ = useQuery({
    queryKey: ["questionnaire", questionnaireId],
    queryFn: () => api("GET", `questionnaires/${questionnaireId}`),
  });
  const questions: Question[] = qQ.data?.questions ?? [];

  // Start (or resume) a draft response when the questionnaire loads.
  const startQ = useQuery({
    queryKey: ["q-response", questionnaireId],
    queryFn: async () => {
      const r = await api(
        "POST",
        `questionnaires/${questionnaireId}/responses`,
        {
          context_type: contextType,
          context_id: contextId,
        },
      );
      setResponseId(r.id);
      // hydrate existing answers if resuming
      const hydrated: Record<string, any> = {};
      (r.answers ?? []).forEach((a: any) => {
        hydrated[a.question_id] = a.value_json ?? a.value_text ?? a.document_id;
      });
      setAnswers(hydrated);
      return r;
    },
  });

  const setAnswer = (qid: string, value: any) =>
    setAnswers((p) => ({ ...p, [qid]: value }));

  const submit = useMutation({
    mutationFn: async () => {
      if (!responseId) throw new Error("Response not ready.");
      // Build answer payloads by question type.
      const payload = questions.map((q) => {
        const v = answers[q.id];
        if (["single_choice", "multi_choice", "boolean"].includes(q.type)) {
          return {
            question_id: q.id,
            value_json: v ?? (q.type === "multi_choice" ? [] : null),
          };
        }
        return { question_id: q.id, value_text: v != null ? String(v) : null };
      });
      await api("POST", `responses/${responseId}/answers`, {
        answers: payload,
      });
      return api("POST", `responses/${responseId}/submit`, {});
    },
    onSuccess: (r: any) => onSubmitted(r.id ?? responseId),
    onError: (e: Error) => setMsg(e.message),
  });

  if (qQ.isLoading || startQ.isLoading) {
    return (
      <p className="text-[11px] text-neutral-400">Loading questionnaire…</p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id}>
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            {q.prompt}{" "}
            {q.is_required && <span className="text-red-500">*</span>}
          </label>
          {q.help_text && (
            <p className="text-[11px] text-neutral-400 m-0 mb-1">
              {q.help_text}
            </p>
          )}
          <QuestionInput
            q={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />
        </div>
      ))}

      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending || !responseId}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {submit.isPending ? "Submitting…" : "Submit answers"}
      </button>
      {msg && <p className="text-[11px] text-red-600 mt-1 m-0">{msg}</p>}
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  const base =
    "w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white";

  switch (q.type) {
    case "long_text":
      return (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={base}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
    case "boolean":
      return (
        <div className="flex gap-2">
          {[
            ["true", "Yes"],
            ["false", "No"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => onChange(v === "true")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                String(value) === v
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      );
    case "single_choice":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select…</option>
          {(q.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "multi_choice": {
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (v: string) =>
        onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                arr.includes(o.value)
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    case "file":
      // File answers go through the Documents domain; for now capture a document id.
      // (Reuse your DocumentUpload component here if you want inline upload.)
      return (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Document id (upload via Documents)"
          className={base}
        />
      );
    default:
      return (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
  }
}
