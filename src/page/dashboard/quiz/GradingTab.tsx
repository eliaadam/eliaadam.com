import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  Attempt,
  AttemptResponse,
  Quiz,
} from "../../../lib/sdk/domains/quiz";
import {
  cardClass,
  errorMessage,
  errorTextClass,
  formatDateTime,
  inputClass,
  labelClass,
  secondaryButtonClass,
  StatusBadge,
} from "./ui";

export function GradingTab({ containerId }: { containerId: string }) {
  const { data: quizzes } = useQuery({
    queryKey: ["quiz-quizzes", containerId],
    queryFn: () => sdk.quiz.quizzes(containerId).list(),
  });
  const [quizId, setQuizId] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const { data: attempts } = useQuery({
    queryKey: ["quiz-attempts", containerId, quizId],
    queryFn: () => sdk.quiz.quizzes(containerId).attempts(quizId),
    enabled: !!quizId,
  });

  const pending = attempts?.filter((a) => a.status === "submitted") ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <div>
        <select
          className={inputClass}
          value={quizId}
          onChange={(e) => {
            setQuizId(e.target.value);
            setSelectedAttempt(null);
          }}
        >
          <option value="">Choose a quiz…</option>
          {quizzes?.map((q: Quiz) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
        <div className={`mt-3 ${cardClass}`}>
          {!quizId && (
            <p className="p-3 text-sm text-neutral-500">
              Choose a quiz to see attempts pending grading.
            </p>
          )}
          {quizId && pending.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">
              Nothing pending grading for this quiz.
            </p>
          )}
          {pending.map((a: Attempt) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedAttempt(a.id)}
              className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selectedAttempt === a.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{a.actor_id}</span>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {formatDateTime(a.submitted_at)}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        {selectedAttempt && (
          <GradeAttempt containerId={containerId} attemptId={selectedAttempt} />
        )}
      </div>
    </div>
  );
}

function GradeAttempt({
  containerId,
  attemptId,
}: {
  containerId: string;
  attemptId: string;
}) {
  const queryClient = useQueryClient();
  const { data: attempt } = useQuery({
    queryKey: ["quiz-attempt-admin", containerId, attemptId],
    queryFn: () => sdk.quiz.attemptsAdmin(containerId).get(attemptId),
  });
  const { data: responses } = useQuery({
    queryKey: ["quiz-attempt-responses", containerId, attemptId],
    queryFn: () => sdk.quiz.attemptsAdmin(containerId).responses(attemptId),
  });
  const { data: questions } = useQuery({
    queryKey: ["quiz-questions", containerId],
    queryFn: () => sdk.quiz.questions(containerId).list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["quiz-attempt-responses", containerId, attemptId],
    });
    queryClient.invalidateQueries({
      queryKey: ["quiz-attempt-admin", containerId, attemptId],
    });
  };

  const questionFor = (id: string) => questions?.find((q) => q.id === id);
  const needsGrading =
    responses?.filter(
      (r) => r.requires_manual_grading && r.points_earned === null,
    ) ?? [];
  const alreadyGraded =
    responses?.filter(
      (r) => r.requires_manual_grading && r.points_earned !== null,
    ) ?? [];

  return (
    <div className="space-y-4">
      {attempt && (
        <div className={`${cardClass} flex items-center justify-between p-3`}>
          <span className="font-mono text-xs">{attempt.actor_id}</span>
          <StatusBadge status={attempt.status} />
          {attempt.score !== null && (
            <span className="text-sm font-medium">
              {attempt.score} / {attempt.possible_points}
            </span>
          )}
        </div>
      )}
      {needsGrading.map((r) => (
        <GradeResponseCard
          key={r.id}
          containerId={containerId}
          attemptId={attemptId}
          response={r}
          prompt={questionFor(r.question_id)?.prompt ?? r.question_id}
          onGraded={invalidate}
        />
      ))}
      {needsGrading.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nothing left to grade for this attempt.
        </p>
      )}
      {alreadyGraded.length > 0 && (
        <div className={`${cardClass} p-3`}>
          <h4 className="text-xs font-medium text-neutral-500">
            Already graded
          </h4>
          {alreadyGraded.map((r) => (
            <div key={r.id} className="mt-2 text-sm">
              <div className="font-medium">
                {questionFor(r.question_id)?.prompt ?? r.question_id}
              </div>
              <div className="text-xs text-neutral-500">
                {r.points_earned} / {r.points_possible}
                {r.manual_feedback && ` — ${r.manual_feedback}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GradeResponseCard({
  containerId,
  attemptId,
  response,
  prompt,
  onGraded,
}: {
  containerId: string;
  attemptId: string;
  response: AttemptResponse;
  prompt: string;
  onGraded: () => void;
}) {
  const [points, setPoints] = useState("");
  const [feedback, setFeedback] = useState("");
  const grade = useMutation({
    mutationFn: () =>
      sdk.quiz
        .attemptsAdmin(containerId)
        .gradeResponse(
          attemptId,
          response.question_id,
          Number(points),
          feedback.trim() || undefined,
        ),
    onSuccess: () => {
      setPoints("");
      setFeedback("");
      onGraded();
    },
  });

  return (
    <div className={`${cardClass} p-4`}>
      <div className="text-sm font-medium">{prompt}</div>
      <div className="mt-2 rounded-md bg-neutral-50 p-2 text-sm dark:bg-neutral-900">
        {"text" in response.response_value
          ? response.response_value.text
          : JSON.stringify(response.response_value)}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="w-32">
          <label className={labelClass}>
            Points (out of {response.points_possible})
          </label>
          <input
            type="number"
            min={0}
            max={response.points_possible}
            step={0.01}
            className={inputClass}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Feedback</label>
          <input
            className={inputClass}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={points === "" || grade.isPending}
          onClick={() => grade.mutate()}
        >
          {grade.isPending ? "Saving…" : "Grade"}
        </button>
      </div>
      {grade.isError && (
        <p className={`mt-1.5 ${errorTextClass}`}>
          {errorMessage(grade.error, "Couldn't save this grade.")}
        </p>
      )}
    </div>
  );
}
