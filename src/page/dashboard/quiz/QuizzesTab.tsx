import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  Attempt,
  Quiz,
  QuizQuestionAdmin,
} from "../../../lib/sdk/domains/quiz";
import type { PresentationMode } from "../../../lib/sdk/domains/quizPresentation";
import {
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  formatDateTime,
  inputClass,
  labelClass,
  pillTabClass,
  primaryButtonClass,
  secondaryButtonClass,
  StatusBadge,
} from "./ui";

type SubTab = "compose" | "presentation" | "attempts";

export function QuizzesTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quiz-quizzes", containerId],
    queryFn: () => sdk.quiz.quizzes(containerId).list(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["quiz-quizzes", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.quiz
        .quizzes(containerId)
        .create({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
    onSuccess: (q) => {
      setTitle("");
      setDescription("");
      invalidate();
      setSelected(q.id);
    },
  });
  const toggleActive = useMutation({
    mutationFn: (q: Quiz) =>
      q.is_active
        ? sdk.quiz.quizzes(containerId).deactivate(q.id)
        : sdk.quiz.quizzes(containerId).activate(q.id),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div>
        <div className={cardClass}>
          {isLoading && (
            <p className="p-3 text-sm text-neutral-500">Loading…</p>
          )}
          {quizzes?.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">No quizzes yet.</p>
          )}
          {quizzes?.map((q: Quiz) => (
            <div
              key={q.id}
              className={`flex items-center justify-between border-b border-neutral-100 px-3 py-2 last:border-0 dark:border-neutral-900 ${selected === q.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              <button
                type="button"
                className="flex-1 text-left text-sm font-medium"
                onClick={() => setSelected(q.id)}
              >
                {q.title}
                {!q.is_active && (
                  <span className={`ml-1.5 ${badgeClass}`}>inactive</span>
                )}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate(q)}
              >
                {q.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New quiz</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-[4rem]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`w-full ${primaryButtonClass}`}
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create quiz"}
            </button>
            {create.isError && (
              <p className={errorTextClass}>
                {errorMessage(create.error, "Couldn't create the quiz.")}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {selected && <QuizDetail containerId={containerId} quizId={selected} />}
      </div>
    </div>
  );
}

function QuizDetail({
  containerId,
  quizId,
}: {
  containerId: string;
  quizId: string;
}) {
  const [sub, setSub] = useState<SubTab>("compose");
  return (
    <div>
      <div className="flex gap-1.5">
        {(
          [
            ["compose", "Compose Questions"],
            ["presentation", "Presentation"],
            ["attempts", "Attempts"],
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
      <div className="mt-3">
        {sub === "compose" && (
          <ComposePanel containerId={containerId} quizId={quizId} />
        )}
        {sub === "presentation" && (
          <PresentationPanel containerId={containerId} quizId={quizId} />
        )}
        {sub === "attempts" && (
          <AttemptsPanel containerId={containerId} quizId={quizId} />
        )}
      </div>
    </div>
  );
}

function ComposePanel({
  containerId,
  quizId,
}: {
  containerId: string;
  quizId: string;
}) {
  const queryClient = useQueryClient();
  const { data: composed } = useQuery({
    queryKey: ["quiz-composed", containerId, quizId],
    queryFn: () => sdk.quiz.quizzes(containerId).questionsAdmin(quizId),
  });
  const { data: allQuestions } = useQuery({
    queryKey: ["quiz-questions", containerId],
    queryFn: () => sdk.quiz.questions(containerId).list(true),
  });
  const [questionId, setQuestionId] = useState("");
  const [pointsOverride, setPointsOverride] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["quiz-composed", containerId, quizId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.quiz.quizzes(containerId).addQuestion(quizId, {
        question_id: questionId,
        position: composed?.length ?? 0,
        points_override: pointsOverride ? Number(pointsOverride) : undefined,
      }),
    onSuccess: () => {
      setQuestionId("");
      setPointsOverride("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (qid: string) =>
      sdk.quiz.quizzes(containerId).removeQuestion(quizId, qid),
    onSuccess: invalidate,
  });

  const availableQuestions =
    allQuestions?.filter((q) => !composed?.some((c) => c.id === q.id)) ?? [];
  const totalPoints = composed?.reduce((sum, c) => sum + c.points, 0) ?? 0;

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Prompt</th>
            <th className="px-3 py-2 font-medium">Points</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {composed?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                No questions in this quiz yet.
              </td>
            </tr>
          )}
          {composed?.map((c: QuizQuestionAdmin) => (
            <tr
              key={c.quiz_question_id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 text-neutral-500">{c.position}</td>
              <td
                className="max-w-xs truncate px-3 py-2 font-medium"
                title={c.prompt}
              >
                {c.prompt}
              </td>
              <td className="px-3 py-2">{c.points}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(c.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {composed && composed.length > 0 && (
          <tfoot>
            <tr>
              <td
                colSpan={2}
                className="px-3 py-2 text-right text-xs font-medium text-neutral-500"
              >
                Total possible points
              </td>
              <td className="px-3 py-2 font-medium">{totalPoints}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <div className="flex items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex-1">
          <label className={labelClass}>Add a question</label>
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
          <label className={labelClass}>Points override</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            className={inputClass}
            value={pointsOverride}
            onChange={(e) => setPointsOverride(e.target.value)}
            placeholder="default"
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!questionId || add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </button>
      </div>
      {add.isError && (
        <p className={`px-3 pb-3 ${errorTextClass}`}>
          {errorMessage(add.error, "Couldn't add that question.")}
        </p>
      )}
    </div>
  );
}

function PresentationPanel({
  containerId,
  quizId,
}: {
  containerId: string;
  quizId: string;
}) {
  const queryClient = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["qp-profiles", containerId],
    queryFn: () => sdk.quizPresentation.profiles(containerId).list(),
  });
  const { data: resolved } = useQuery({
    queryKey: ["qp-resolved", containerId, quizId],
    queryFn: () => sdk.quizPresentation.resolveForQuiz(containerId, quizId),
  });
  const [profileId, setProfileId] = useState("");
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<PresentationMode>("formal");

  const invalidateResolved = () =>
    queryClient.invalidateQueries({
      queryKey: ["qp-resolved", containerId, quizId],
    });
  const invalidateProfiles = () =>
    queryClient.invalidateQueries({ queryKey: ["qp-profiles", containerId] });
  const assign = useMutation({
    mutationFn: () =>
      sdk.quizPresentation.assignToQuiz(containerId, quizId, profileId),
    onSuccess: invalidateResolved,
  });
  const createProfile = useMutation({
    mutationFn: () =>
      sdk.quizPresentation
        .profiles(containerId)
        .create({ name: newName.trim(), mode: newMode }),
    onSuccess: () => {
      setNewName("");
      invalidateProfiles();
    },
  });

  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-sm">
        Currently:{" "}
        <span className="font-medium capitalize">
          {resolved?.mode ?? "formal"}
        </span>
        {resolved?.id ? "" : " (built-in default — nothing assigned)"}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Assign a profile</label>
          <select
            className={inputClass}
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="">Choose a profile…</option>
            {profiles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.mode})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!profileId || assign.isPending}
          onClick={() => assign.mutate()}
        >
          Assign
        </button>
      </div>
      {assign.isError && (
        <p className={`mt-1.5 ${errorTextClass}`}>
          {errorMessage(assign.error, "Couldn't assign that profile.")}
        </p>
      )}

      <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <label className={labelClass}>Or create a new profile</label>
        <div className="mt-1.5 flex items-end gap-2">
          <input
            className={inputClass}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Game Show Style"
          />
          <select
            className={inputClass}
            value={newMode}
            onChange={(e) => setNewMode(e.target.value as PresentationMode)}
          >
            {(
              [
                "formal",
                "practice",
                "survey",
                "assessment",
                "challenge",
                "competition",
                "game",
                "simulation",
                "adaptive",
              ] as PresentationMode[]
            ).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!newName.trim() || createProfile.isPending}
            onClick={() => createProfile.mutate()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function AttemptsPanel({
  containerId,
  quizId,
}: {
  containerId: string;
  quizId: string;
}) {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ["quiz-attempts", containerId, quizId],
    queryFn: () => sdk.quiz.quizzes(containerId).attempts(quizId),
  });
  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Started</th>
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
          {attempts?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                No attempts yet.
              </td>
            </tr>
          )}
          {attempts?.map((a: Attempt) => (
            <tr
              key={a.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 font-mono text-xs">{a.actor_id}</td>
              <td className="px-3 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-3 py-2">
                {a.score !== null ? `${a.score} / ${a.possible_points}` : "—"}
              </td>
              <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                {formatDateTime(a.started_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {attempts?.some((a) => a.status === "submitted") && (
        <p className="border-t border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-800">
          Attempts marked "submitted" have manually-graded questions pending —
          see the Grading tab.
        </p>
      )}
    </div>
  );
}
