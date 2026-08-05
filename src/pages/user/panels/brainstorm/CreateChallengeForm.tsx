import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { brainstormApi as api, toMajor } from "./brainstorm-api";

type Q = { id: string; prompt: string; answer: boolean };
type Gift = { code: string; label: string; amount: number; emoji: string };

/**
 * Create a true/false challenge with a fixed window, optional gift-based award
 * (ranked splits), and optional entry fee. (First type/timing model; the form
 * expands as new types/models are added — driven by /catalogs.)
 */
export default function CreateChallengeForm({ containerId, onClose, onCreated }: { containerId: string; onClose: () => void; onCreated: () => void }) {
  const catalogs = useQuery({ queryKey: ["brainstorm", "catalogs"], queryFn: () => api("GET", `/catalogs`) });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Q[]>([{ id: "q1", prompt: "", answer: true }]);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [entryFee, setEntryFee] = useState("0");
  const [giftSel, setGiftSel] = useState<Record<string, number>>({});   // code → qty
  const [splits, setSplits] = useState<{ rank: number; bps: number }[]>([{ rank: 1, bps: 6000 }, { rank: 2, bps: 3000 }, { rank: 3, bps: 1000 }]);

  const gifts: Gift[] = catalogs.data?.gifts ?? [];
  const awardTotal = gifts.reduce((sum, g) => sum + (giftSel[g.code] ?? 0) * g.amount, 0);

  const addQ = () => setQuestions([...questions, { id: `q${questions.length + 1}`, prompt: "", answer: true }]);
  const setQ = (i: number, patch: Partial<Q>) => setQuestions(questions.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const setGift = (code: string, qty: number) => setGiftSel({ ...giftSel, [code]: Math.max(0, qty) });

  const create = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/challenges`, {
      title: title.trim(),
      description: description.trim() || null,
      type: "true_false",
      timing_model: "fixed_window",
      definition: { questions: questions.filter((q) => q.prompt.trim()) },
      timing_config: { opens_at: opensAt, closes_at: closesAt },
      pass_score: 1,
      award_gifts: Object.entries(giftSel).filter(([, q]) => q > 0).map(([code, qty]) => ({ code, qty })),
      award_splits: awardTotal > 0 ? splits : [],
      entry_fee: Math.round(parseFloat(entryFee || "0") * 100),
    }),
    onSuccess: onCreated,
  });

  const input = "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <button onClick={onClose} className="text-xs text-neutral-500">← Back</button>
      <div className="text-lg font-semibold text-black dark:text-white">New True/False challenge</div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={`${input} w-full`} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className={`${input} w-full`} />

      <div>
        <div className="text-[11px] font-medium text-neutral-500 mb-1">Questions (with correct answers — kept server-side)</div>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex gap-2 items-center">
              <input value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} placeholder={`Question ${i + 1}`} className={`${input} flex-1`} />
              <select value={String(q.answer)} onChange={(e) => setQ(i, { answer: e.target.value === "true" })} className={input}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          ))}
        </div>
        <button onClick={addQ} className="mt-2 text-xs text-blue-600">+ Add question</button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-neutral-500">Opens at</label>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={`${input} w-full`} />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-neutral-500">Closes at</label>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={`${input} w-full`} />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-medium text-neutral-500 mb-1">Award (gifts — money escrowed underneath)</div>
        <div className="flex flex-wrap gap-2">
          {gifts.map((g) => (
            <div key={g.code} className="flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1">
              <span title={`${g.label} = ${toMajor(g.amount)}`}>{g.emoji}</span>
              <input type="number" min="0" value={giftSel[g.code] ?? 0} onChange={(e) => setGift(g.code, parseInt(e.target.value || "0"))} className="w-12 text-xs bg-transparent text-black dark:text-white" />
            </div>
          ))}
        </div>
        {awardTotal > 0 && <div className="text-[11px] text-green-600 mt-1">Total escrowed: {toMajor(awardTotal)} (split 1st/2nd/3rd = 60/30/10%)</div>}
      </div>

      <div>
        <label className="text-[11px] text-neutral-500">Entry fee (0 = free)</label>
        <input type="number" min="0" step="0.01" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} className={`${input} w-40 block`} />
      </div>

      <button onClick={() => create.mutate()} disabled={!title.trim() || !opensAt || !closesAt || create.isPending} className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
        {create.isPending ? "Creating…" : awardTotal > 0 ? `Create & escrow ${toMajor(awardTotal)}` : "Create challenge"}
      </button>
      {create.isError && <div className="text-xs text-red-600">{(create.error as any)?.message}</div>}
    </div>
  );
}
