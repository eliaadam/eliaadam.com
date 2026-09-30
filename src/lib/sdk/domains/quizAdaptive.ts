import { api } from "../../query/Api";

/** Typed client for `core.quiz_adaptive`'s REST API (`/api/quiz-adaptive/...`). */

export interface AdaptiveRule {
  id: string;
  name: string;
  difficulty_ladder: string[];
  starting_difficulty: string;
  promote_after: number;
  demote_after: number;
}

export interface AdaptiveSession {
  id: string;
  attempt_id: string;
  rule_id: string;
  pool_id: string;
  current_difficulty: string;
  consecutive_correct: number;
  consecutive_incorrect: number;
  served_question_ids: string[];
}

function base(containerId: string) {
  return `/api/quiz-adaptive/containers/${containerId}`;
}

function rules(containerId: string) {
  const b = `${base(containerId)}/rules`;
  return {
    list: () => api.get<{ rules: AdaptiveRule[] }>(`${b}/`).then((r) => r.rules),
    create: (input: { name: string; difficulty_ladder: string[]; starting_difficulty: string; promote_after?: number; demote_after?: number }) =>
      api.post<AdaptiveRule>(`${b}/create/`, input),
  };
}

function sessions(containerId: string) {
  const b = (attemptId: string) => `${base(containerId)}/attempts/${attemptId}`;
  return {
    start: (attemptId: string, ruleId: string, poolId: string) =>
      api.post<AdaptiveSession>(`${b(attemptId)}/start/`, { rule_id: ruleId, pool_id: poolId }),
    get: (attemptId: string) => api.get<AdaptiveSession>(`${b(attemptId)}/`),
    next: (attemptId: string) => api.get<{ question_id: string | null }>(`${b(attemptId)}/next/`).then((r) => r.question_id),
    recordOutcome: (attemptId: string, wasCorrect: boolean) => api.post<AdaptiveSession>(`${b(attemptId)}/outcome/`, { was_correct: wasCorrect }),
  };
}

export const quizAdaptive = { rules, sessions };
