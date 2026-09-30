import { api } from "../../query/Api";

/** Typed client for `core.quiz_pools`'s REST API (`/api/quiz-pools/...`). */

export interface QuestionPool {
  id: string;
  name: string;
  description: string;
}

export interface PoolMembership {
  id: string;
  pool_id: string;
  question_id: string;
  difficulty: string;
}

function base(containerId: string) {
  return `/api/quiz-pools/containers/${containerId}`;
}

function pools(containerId: string) {
  const b = `${base(containerId)}/pools`;
  return {
    list: () => api.get<{ pools: QuestionPool[] }>(`${b}/`).then((r) => r.pools),
    get: (poolId: string) => api.get<QuestionPool>(`${b}/${poolId}/`),
    create: (input: { name: string; description?: string }) => api.post<QuestionPool>(`${b}/create/`, input),
    members: (poolId: string) => api.get<{ members: PoolMembership[] }>(`${b}/${poolId}/members/`).then((r) => r.members),
    addMember: (poolId: string, questionId: string, difficulty?: string) =>
      api.post<PoolMembership>(`${b}/${poolId}/members/add/`, { question_id: questionId, difficulty }),
    removeMember: (poolId: string, questionId: string) => api.post<{ removed: true }>(`${b}/${poolId}/members/${questionId}/remove/`, {}),
    draw: (poolId: string, input: { count?: number; difficulty_counts?: Record<string, number>; exclude_question_ids?: string[]; seed?: number }) =>
      api.post<{ question_ids: string[] }>(`${b}/${poolId}/draw/`, input).then((r) => r.question_ids),
  };
}

export const quizPools = { pools };
