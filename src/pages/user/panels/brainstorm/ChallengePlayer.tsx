import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { brainstormApi as api, toMajor } from "./brainstorm-api";

type PlayView = {
  id: string; title: string; description: string | null; type: string; status: string;
  is_open: boolean; max_score: number; pass_score: number;
  entry_fee: number; entry_currency: string; award_total: number; award_currency: string;
  public_definition: { questions: { id: string; prompt: string }[] };
};

/** Plays a true/false challenge. Answers are scored server-side. */
export default function ChallengePlayer({ containerId, challengeId, onClose }: { containerId: string; challengeId: string; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{ score: number; max_score: number; passed: boolean } | null>(null);
  const [started, setStarted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const view = useQuery({
    queryKey: ["brainstorm", "play", containerId, challengeId],
    queryFn: () => api("GET", `/containers/${containerId}/challenges/${challengeId}`) as Promise<PlayView>,
  });

  const start = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/challenges/${challengeId}/start`),
    onSuccess: () => { setStarted(true); setErr(null); },
    onError: (e: any) => setErr(e.message),
  });

  const submit = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/challenges/${challengeId}/submit`, { submission: { answers } }),
    onSuccess: (r: any) => setResult(r),
    onError: (e: any) => setErr(e.message),
  });

  const c = view.data;
  if (view.isLoading || !c) return <div className="p-6 text-sm text-neutral-500">Loading challenge…</div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <button onClick={onClose} className="text-xs text-neutral-500">← Back</button>

      <div>
        <div className="text-lg font-semibold text-black dark:text-white">{c.title}</div>
        {c.description && <div className="text-sm text-neutral-500 mt-1">{c.description}</div>}
        <div className="text-[11px] text-neutral-400 mt-2 flex gap-3">
          <span>pass ≥ {c.pass_score}/{c.max_score}</span>
          {c.award_total > 0 && <span className="text-green-600">award {toMajor(c.award_total)} {c.award_currency}</span>}
          {c.entry_fee > 0 && <span className="text-amber-600">entry {toMajor(c.entry_fee)} {c.entry_currency}</span>}
        </div>
      </div>

      {err && <div className="text-xs px-3 py-2 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">{err}</div>}

      {!c.is_open ? (
        <div className="text-sm text-neutral-500">This challenge isn't open right now.</div>
      ) : result ? (
        <div className={`p-4 rounded-md ${result.passed ? "bg-green-50 dark:bg-green-950" : "bg-neutral-100 dark:bg-neutral-900"}`}>
          <div className="text-sm font-semibold">{result.passed ? "🎉 Passed!" : "Not this time."}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Score: {result.score} / {result.max_score}</div>
          {result.passed && c.award_total > 0 && <div className="text-[11px] text-neutral-500 mt-2">Final ranking and awards are decided when the host resolves the challenge.</div>}
        </div>
      ) : !started ? (
        <div>
          {c.entry_fee > 0 && <div className="text-[11px] text-amber-600 mb-2">This is a paid-entry challenge — buy entry from the marketplace to attempt.</div>}
          <button onClick={() => start.mutate()} disabled={start.isPending} className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
            {start.isPending ? "Starting…" : "Start challenge"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {c.public_definition.questions.map((q, i) => (
            <div key={q.id} className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
              <div className="text-sm text-black dark:text-white mb-2">{i + 1}. {q.prompt}</div>
              <div className="flex gap-2">
                {[true, false].map((val) => (
                  <button key={String(val)} onClick={() => setAnswers({ ...answers, [q.id]: val })}
                    className={`px-3 py-1.5 text-xs rounded-md border ${answers[q.id] === val ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
                    {val ? "True" : "False"}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => submit.mutate()} disabled={submit.isPending || Object.keys(answers).length < c.public_definition.questions.length}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-green-600 text-white disabled:opacity-40">
            {submit.isPending ? "Submitting…" : "Submit answers"}
          </button>
        </div>
      )}
    </div>
  );
}
