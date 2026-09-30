import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  InteractionType,
  Question,
  QuestionOption,
} from "../../../lib/sdk/domains/quiz";
import {
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

const TYPE_LABEL: Record<InteractionType, string> = {
  single_select: "Single choice",
  multi_select: "Multiple choice",
  text: "Text (manual grading)",
  numeric: "Numeric",
};

export function QuestionsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", containerId],
    queryFn: () => sdk.quiz.questions(containerId).list(),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["quiz-questions", containerId],
    });
  const deactivate = useMutation({
    mutationFn: (id: string) => sdk.quiz.questions(containerId).deactivate(id),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_26rem]">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Prompt</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Points</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {questions?.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                  No questions yet.
                </td>
              </tr>
            )}
            {questions?.map((q: Question) => (
              <tr
                key={q.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
              >
                <td
                  className="max-w-xs truncate px-3 py-2 font-medium"
                  title={q.prompt}
                >
                  {q.prompt}
                </td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                  {TYPE_LABEL[q.interaction_type]}
                </td>
                <td className="px-3 py-2">{q.points}</td>
                <td className="px-3 py-2 text-right">
                  {q.is_active ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={deactivate.isPending}
                      onClick={() => deactivate.mutate(q.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <span className={badgeClass}>inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NewQuestionForm containerId={containerId} onCreated={invalidate} />
    </div>
  );
}

function NewQuestionForm({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<InteractionType>("single_select");
  const [points, setPoints] = useState("1");
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: "a", label: "" },
    { id: "b", label: "" },
  ]);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("0");

  const isSelect = type === "single_select" || type === "multi_select";
  const isNumeric = type === "numeric";

  const create = useMutation({
    mutationFn: () =>
      sdk.quiz.questions(containerId).create({
        prompt: prompt.trim(),
        interaction_type: type,
        points: Number(points),
        ...(isSelect
          ? {
              options: options.filter((o) => o.label.trim()),
              correct_option_ids: correctIds,
            }
          : {}),
        ...(isNumeric
          ? {
              numeric_answer: Number(numericAnswer),
              numeric_tolerance: Number(numericTolerance) || 0,
            }
          : {}),
      }),
    onSuccess: () => {
      setPrompt("");
      setPoints("1");
      setOptions([
        { id: "a", label: "" },
        { id: "b", label: "" },
      ]);
      setCorrectIds([]);
      setNumericAnswer("");
      onCreated();
    },
  });

  const addOption = () =>
    setOptions((prev) => [
      ...prev,
      { id: String.fromCharCode(97 + prev.length), label: "" },
    ]);
  const updateOption = (id: string, label: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  const toggleCorrect = (id: string) => {
    if (type === "single_select") {
      setCorrectIds([id]);
      return;
    }
    setCorrectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSubmit =
    prompt.trim().length > 0 &&
    (!isSelect ||
      (options.filter((o) => o.label.trim()).length >= 2 &&
        correctIds.length > 0)) &&
    (!isNumeric || numericAnswer !== "");

  return (
    <div className={`${cardClass} h-fit p-4`}>
      <h3 className="text-sm font-semibold">New question</h3>
      <div className="mt-3 space-y-2.5">
        <div>
          <label className={labelClass}>Prompt</label>
          <textarea
            className={`${inputClass} min-h-[4.5rem]`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as InteractionType);
                setCorrectIds([]);
              }}
            >
              {(Object.keys(TYPE_LABEL) as InteractionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Points</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className={inputClass}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>

        {isSelect && (
          <div className="space-y-1.5">
            <label className={labelClass}>
              Options —{" "}
              {type === "single_select"
                ? "select the one correct answer"
                : "select all correct answers"}
            </label>
            {options.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <input
                  type={type === "single_select" ? "radio" : "checkbox"}
                  name="correct"
                  checked={correctIds.includes(o.id)}
                  onChange={() => toggleCorrect(o.id)}
                />
                <input
                  className={inputClass}
                  value={o.label}
                  onChange={(e) => updateOption(o.id, e.target.value)}
                  placeholder={`Option ${o.id}`}
                />
              </div>
            ))}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={addOption}
            >
              + Add option
            </button>
          </div>
        )}

        {isNumeric && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Correct value</label>
              <input
                type="number"
                className={inputClass}
                value={numericAnswer}
                onChange={(e) => setNumericAnswer(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Tolerance (±)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={numericTolerance}
                onChange={(e) => setNumericTolerance(e.target.value)}
              />
            </div>
          </div>
        )}

        {type === "text" && (
          <p className="text-xs text-neutral-500">
            Text answers are always graded manually — see the Grading tab.
          </p>
        )}

        <button
          type="button"
          className={`w-full ${primaryButtonClass}`}
          disabled={!canSubmit || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Creating…" : "Create question"}
        </button>
        {create.isError && (
          <p className={errorTextClass}>
            {errorMessage(create.error, "Couldn't create the question.")}
          </p>
        )}
      </div>
    </div>
  );
}
