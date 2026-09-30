import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  PoolMembership,
  QuestionPool,
} from "../../../lib/sdk/domains/quizPools";
import type { AdaptiveRule } from "../../../lib/sdk/domains/quizAdaptive";
import {
  cardClass,
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  pillTabClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

type SubTab = "pools" | "adaptive-rules";

export function PoolsTab({ containerId }: { containerId: string }) {
  const [sub, setSub] = useState<SubTab>("pools");
  return (
    <div>
      <div className="flex gap-1.5">
        {(
          [
            ["pools", "Question Pools"],
            ["adaptive-rules", "Adaptive Rules"],
          ] as [SubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={pillTabClass(sub === key)}
            onClick={() => setSub(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {sub === "pools" && <PoolsPanel containerId={containerId} />}
        {sub === "adaptive-rules" && (
          <AdaptiveRulesPanel containerId={containerId} />
        )}
      </div>
    </div>
  );
}

function PoolsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: pools, isLoading } = useQuery({
    queryKey: ["qpool-pools", containerId],
    queryFn: () => sdk.quizPools.pools(containerId).list(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["qpool-pools", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.quizPools.pools(containerId).create({ name: name.trim() }),
    onSuccess: (p) => {
      setName("");
      invalidate();
      setSelected(p.id);
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <div>
        <div className={cardClass}>
          {isLoading && (
            <p className="p-3 text-sm text-neutral-500">Loading…</p>
          )}
          {pools?.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">No pools yet.</p>
          )}
          {pools?.map((p: QuestionPool) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === p.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New pool</h3>
          <div className="mt-3 space-y-2.5">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematics — Fractions"
            />
            <button
              type="button"
              className={`w-full ${primaryButtonClass}`}
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create pool"}
            </button>
            {create.isError && (
              <p className={errorTextClass}>
                {errorMessage(create.error, "Couldn't create the pool.")}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {selected && <PoolDetail containerId={containerId} poolId={selected} />}
      </div>
    </div>
  );
}

function PoolDetail({
  containerId,
  poolId,
}: {
  containerId: string;
  poolId: string;
}) {
  const queryClient = useQueryClient();
  const { data: members } = useQuery({
    queryKey: ["qpool-members", containerId, poolId],
    queryFn: () => sdk.quizPools.pools(containerId).members(poolId),
  });
  const { data: questions } = useQuery({
    queryKey: ["quiz-questions", containerId],
    queryFn: () => sdk.quiz.questions(containerId).list(true),
  });
  const [questionId, setQuestionId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [drawCount, setDrawCount] = useState("5");
  const [drawResult, setDrawResult] = useState<string[] | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["qpool-members", containerId, poolId],
    });
  const addMember = useMutation({
    mutationFn: () =>
      sdk.quizPools
        .pools(containerId)
        .addMember(poolId, questionId, difficulty.trim() || undefined),
    onSuccess: () => {
      setQuestionId("");
      setDifficulty("");
      invalidate();
    },
  });
  const removeMember = useMutation({
    mutationFn: (qid: string) =>
      sdk.quizPools.pools(containerId).removeMember(poolId, qid),
    onSuccess: invalidate,
  });

  const questionPrompt = (id: string) =>
    questions?.find((q) => q.id === id)?.prompt.slice(0, 60) ?? id;
  const availableQuestions =
    questions?.filter((q) => !members?.some((m) => m.question_id === q.id)) ??
    [];

  const draw = async () => {
    setDrawError(null);
    setDrawResult(null);
    try {
      const result = await sdk.quizPools
        .pools(containerId)
        .draw(poolId, { count: Number(drawCount) });
      setDrawResult(result);
    } catch (e) {
      setDrawError(errorMessage(e, "Couldn't draw from this pool."));
    }
  };

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Question</th>
              <th className="px-3 py-2 font-medium">Difficulty</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {members?.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={3}>
                  No questions in this pool yet.
                </td>
              </tr>
            )}
            {members?.map((m: PoolMembership) => (
              <tr
                key={m.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
              >
                <td className="px-3 py-2">{questionPrompt(m.question_id)}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                  {m.difficulty || "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.question_id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex-1">
            <label className={labelClass}>Add question</label>
            <select
              className={inputClass}
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
            >
              <option value="">Choose a question…</option>
              {availableQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.prompt.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className={labelClass}>Difficulty</label>
            <input
              className={inputClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              placeholder="easy/medium/hard"
            />
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!questionId || addMember.isPending}
            onClick={() => addMember.mutate()}
          >
            Add
          </button>
        </div>
        {addMember.isError && (
          <p className={`px-3 pb-3 ${errorTextClass}`}>
            {errorMessage(addMember.error, "Couldn't add that question.")}
          </p>
        )}
      </div>

      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">Try a draw</h3>
        <div className="mt-2 flex items-end gap-2">
          <div className="w-32">
            <label className={labelClass}>Count</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={drawCount}
              onChange={(e) => setDrawCount(e.target.value)}
            />
          </div>
          <button type="button" className={secondaryButtonClass} onClick={draw}>
            Draw
          </button>
        </div>
        {drawError && <p className={`mt-2 ${errorTextClass}`}>{drawError}</p>}
        {drawResult && (
          <ul className="mt-2 space-y-1 text-sm">
            {drawResult.map((id) => (
              <li key={id}>{questionPrompt(id)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdaptiveRulesPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useQuery({
    queryKey: ["qad-rules", containerId],
    queryFn: () => sdk.quizAdaptive.rules(containerId).list(),
  });
  const [name, setName] = useState("");
  const [ladder, setLadder] = useState("easy,medium,hard");
  const [starting, setStarting] = useState("medium");
  const [promoteAfter, setPromoteAfter] = useState("2");
  const [demoteAfter, setDemoteAfter] = useState("2");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["qad-rules", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.quizAdaptive.rules(containerId).create({
        name: name.trim(),
        difficulty_ladder: ladder
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        starting_difficulty: starting.trim(),
        promote_after: Number(promoteAfter),
        demote_after: Number(demoteAfter),
      }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
      <div className={cardClass}>
        {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
        {rules?.length === 0 && (
          <p className="p-3 text-sm text-neutral-500">No adaptive rules yet.</p>
        )}
        {rules?.map((r: AdaptiveRule) => (
          <div
            key={r.id}
            className="border-b border-neutral-100 p-3 last:border-0 dark:border-neutral-900"
          >
            <div className="text-sm font-medium">{r.name}</div>
            <div className="text-xs text-neutral-500">
              {r.difficulty_ladder.join(" → ")} · starts at{" "}
              {r.starting_difficulty} · promote after {r.promote_after}, demote
              after {r.demote_after}
            </div>
          </div>
        ))}
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New rule</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Difficulty ladder (comma-separated, easiest first)
            </label>
            <input
              className={inputClass}
              value={ladder}
              onChange={(e) => setLadder(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Starting difficulty</label>
            <input
              className={inputClass}
              value={starting}
              onChange={(e) => setStarting(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Promote after</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={promoteAfter}
                onChange={(e) => setPromoteAfter(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Demote after</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={demoteAfter}
                onChange={(e) => setDemoteAfter(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className={`w-full ${primaryButtonClass}`}
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create rule"}
          </button>
          {create.isError && (
            <p className={errorTextClass}>
              {errorMessage(create.error, "Couldn't create the rule.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
