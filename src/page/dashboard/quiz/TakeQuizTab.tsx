import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  QuizQuestionPublic,
  ResponseValue,
} from "../../../lib/sdk/domains/quiz";
import {
  cardClass,
  errorMessage,
  errorTextClass,
  formatDateTime,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  StatusBadge,
} from "./ui";

export function TakeQuizTab({ containerId }: { containerId: string }) {
  const { data: quizzes } = useQuery({
    queryKey: ["quiz-quizzes-active", containerId],
    queryFn: () => sdk.quiz.quizzes(containerId).list(true),
  });
  const { data: myAttempts, refetch: refetchMine } = useQuery({
    queryKey: ["quiz-my-attempts", containerId],
    queryFn: () => sdk.quiz.myAttempts(containerId).list(),
  });
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: (quizId: string) =>
      sdk.quiz.quizzes(containerId).startAttempt(quizId),
    onSuccess: (a) => {
      setActiveAttemptId(a.id);
      refetchMine();
    },
    onError: (e) => setStartError(errorMessage(e, "Couldn't start this quiz.")),
  });

  if (activeAttemptId) {
    return (
      <AttemptRunner
        containerId={containerId}
        attemptId={activeAttemptId}
        onDone={() => {
          setActiveAttemptId(null);
          refetchMine();
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Quiz</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {quizzes?.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={2}>
                  No quizzes available.
                </td>
              </tr>
            )}
            {quizzes?.map((q) => {
              const inProgress = (myAttempts ?? []).find(
                (a) => a.quiz_id === q.id && a.status === "in_progress",
              );
              return (
                <tr
                  key={q.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{q.title}</div>
                    {q.description && (
                      <div className="text-xs text-neutral-500">
                        {q.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {inProgress ? (
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={() => setActiveAttemptId(inProgress.id)}
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={start.isPending}
                        onClick={() => {
                          setStartError(null);
                          start.mutate(q.id);
                        }}
                      >
                        Start
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {startError && (
          <p className={`px-3 pb-3 ${errorTextClass}`}>{startError}</p>
        )}
      </div>
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">My past attempts</h3>
        <div className="mt-2 space-y-2">
          {myAttempts?.filter((a) => a.status !== "in_progress").length ===
            0 && <p className="text-sm text-neutral-500">None yet.</p>}
          {myAttempts
            ?.filter((a) => a.status !== "in_progress")
            .map((a) => (
              <button
                key={a.id}
                type="button"
                className="block w-full rounded-md border border-neutral-200 p-2 text-left text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
                onClick={() => setActiveAttemptId(a.id)}
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={a.status} />
                  {a.score !== null && (
                    <span className="font-medium">
                      {a.score} / {a.possible_points}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-neutral-500">
                  {formatDateTime(a.started_at)}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function AttemptRunner({
  containerId,
  attemptId,
  onDone,
}: {
  containerId: string;
  attemptId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: attempt } = useQuery({
    queryKey: ["quiz-my-attempt", containerId, attemptId],
    queryFn: () => sdk.quiz.myAttempts(containerId).get(attemptId),
  });
  const { data: questions } = useQuery({
    queryKey: ["quiz-take-questions", containerId, attempt?.quiz_id],
    queryFn: () =>
      sdk.quiz.quizzes(containerId).questionsPublic(attempt!.quiz_id),
    enabled: !!attempt,
  });
  const { data: myResponses } = useQuery({
    queryKey: ["quiz-my-responses", containerId, attemptId],
    queryFn: () => sdk.quiz.myAttempts(containerId).responses(attemptId),
  });
  const [pending, setPending] = useState<Record<string, ResponseValue>>({});

  const invalidateResponses = () =>
    queryClient.invalidateQueries({
      queryKey: ["quiz-my-responses", containerId, attemptId],
    });
  const respond = useMutation({
    mutationFn: ({
      questionId,
      value,
    }: {
      questionId: string;
      value: ResponseValue;
    }) =>
      sdk.quiz.myAttempts(containerId).respond(attemptId, questionId, value),
    onSuccess: invalidateResponses,
  });
  const submit = useMutation({
    mutationFn: () => sdk.quiz.myAttempts(containerId).submit(attemptId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["quiz-my-attempt", containerId, attemptId],
      }),
  });
  const recordXp = useMutation({
    mutationFn: () => sdk.quizGamification.recordResult(containerId, attemptId),
  });

  const responseFor = (questionId: string) =>
    myResponses?.find((r) => r.question_id === questionId);
  const allAnswered =
    questions?.every((q) => pending[q.id] || responseFor(q.id)) ?? false;

  const setPendingValue = (questionId: string, value: ResponseValue) => {
    setPending((prev) => ({ ...prev, [questionId]: value }));
    respond.mutate({ questionId, value });
  };

  if (!attempt || !questions)
    return <p className="text-sm text-neutral-500">Loading…</p>;

  if (attempt.status !== "in_progress") {
    return (
      <div className={`${cardClass} p-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Result</h2>
          <StatusBadge status={attempt.status} />
        </div>
        {attempt.status === "evaluated" ? (
          <p className="mt-2 text-2xl font-semibold">
            {attempt.score}{" "}
            <span className="text-sm font-normal text-neutral-500">
              / {attempt.possible_points}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">
            Submitted — waiting on manual grading for one or more questions.
          </p>
        )}
        <div className="mt-4 space-y-2">
          {questions.map((q) => {
            const r = responseFor(q.id);
            return (
              <div
                key={q.id}
                className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
              >
                <div className="font-medium">{q.prompt}</div>
                {r && (
                  <div className="mt-1 text-xs text-neutral-500">
                    {r.is_correct === true && (
                      <span className="text-green-600 dark:text-green-400">
                        Correct
                      </span>
                    )}
                    {r.is_correct === false && (
                      <span className="text-red-600 dark:text-red-400">
                        Incorrect
                      </span>
                    )}
                    {r.is_correct === null && <span>Pending grading</span>}
                    {" — "}
                    {r.points_earned ?? "?"} / {r.points_possible} points
                    {r.manual_feedback && (
                      <div className="mt-0.5">
                        Feedback: {r.manual_feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          {attempt.status === "evaluated" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={recordXp.isPending}
              onClick={() => recordXp.mutate()}
            >
              {recordXp.isPending ? "Recording…" : "Record XP"}
            </button>
          )}
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onDone}
          >
            Back to quizzes
          </button>
        </div>
        {recordXp.isSuccess && (
          <p className="mt-2 text-xs text-neutral-500">
            +{recordXp.data.xp_earned} XP
            {recordXp.data.newly_unlocked.length > 0 &&
              ` — unlocked: ${recordXp.data.newly_unlocked.join(", ")}`}
          </p>
        )}
        {recordXp.isError && (
          <p className={`mt-2 ${errorTextClass}`}>
            {errorMessage(
              recordXp.error,
              "Couldn't record XP for this attempt.",
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Answer the questions</h2>
        <span className="text-xs text-neutral-500">
          {attempt.possible_points} points possible
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <QuestionRunner
            key={q.id}
            index={i + 1}
            question={q}
            value={pending[q.id]}
            onChange={(v) => setPendingValue(q.id, v)}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
        {submit.isError && (
          <p className={errorTextClass}>
            {errorMessage(submit.error, "Couldn't submit.")}
          </p>
        )}
        <button
          type="button"
          className={`ml-auto ${primaryButtonClass}`}
          disabled={!allAnswered || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function QuestionRunner({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: QuizQuestionPublic;
  value: ResponseValue | undefined;
  onChange: (v: ResponseValue) => void;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-sm font-medium">
        {index}. {question.prompt}{" "}
        <span className="text-xs font-normal text-neutral-500">
          ({question.points ?? ""})
        </span>
      </div>
      <div className="mt-2">
        {question.interaction_type === "single_select" && (
          <div className="space-y-1">
            {question.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={question.id}
                  checked={
                    value && "option_id" in value && value.option_id === o.id
                  }
                  onChange={() => onChange({ option_id: o.id })}
                />
                {o.label}
              </label>
            ))}
          </div>
        )}
        {question.interaction_type === "multi_select" && (
          <div className="space-y-1">
            {question.options.map((o) => {
              const chosen =
                value && "option_ids" in value ? value.option_ids : [];
              return (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={chosen.includes(o.id)}
                    onChange={() =>
                      onChange({
                        option_ids: chosen.includes(o.id)
                          ? chosen.filter((id) => id !== o.id)
                          : [...chosen, o.id],
                      })
                    }
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        )}
        {question.interaction_type === "text" && (
          <textarea
            className={`${inputClass} min-h-[4rem]`}
            value={value && "text" in value ? value.text : ""}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        )}
        {question.interaction_type === "numeric" && (
          <input
            type="number"
            className={inputClass}
            value={value && "value" in value ? value.value : ""}
            onChange={(e) => onChange({ value: Number(e.target.value) })}
          />
        )}
      </div>
    </div>
  );
}
