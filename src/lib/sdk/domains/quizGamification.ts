import { api } from "../../query/Api";

/** Typed client for `core.quiz_gamification`'s REST API (`/api/quiz-gamification/...`). */

export interface GamificationProfile {
  id: string;
  name: string;
  xp_per_point: number;
  level_thresholds: number[];
  streak_enabled: boolean;
  is_default: boolean;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  criteria: Record<string, unknown>;
}

export interface ActorState {
  actor_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  attempts_evaluated: number;
  achievement_codes: string[];
  last_activity_date: string | null;
}

export interface RecordResultOutcome {
  xp_earned: number;
  newly_unlocked: string[];
  state: ActorState;
}

function base(containerId: string) {
  return `/api/quiz-gamification/containers/${containerId}`;
}

function profiles(containerId: string) {
  const b = `${base(containerId)}/profiles`;
  return {
    list: () => api.get<{ profiles: GamificationProfile[] }>(`${b}/`).then((r) => r.profiles),
    create: (input: { name: string; xp_per_point?: number; level_thresholds?: number[]; streak_enabled?: boolean; is_default?: boolean }) =>
      api.post<GamificationProfile>(`${b}/create/`, input),
  };
}

function achievements(containerId: string) {
  const b = `${base(containerId)}/achievements`;
  return {
    list: () => api.get<{ achievements: Achievement[] }>(`${b}/`).then((r) => r.achievements),
    create: (input: { code: string; name: string; description?: string; criteria: Record<string, unknown> }) =>
      api.post<Achievement>(`${b}/create/`, input),
  };
}

function myState(containerId: string) {
  return api.get<ActorState>(`${base(containerId)}/me/`);
}

function leaderboard(containerId: string, topN = 10) {
  return api.get<{ leaderboard: ActorState[] }>(`${base(containerId)}/leaderboard/?top_n=${topN}`).then((r) => r.leaderboard);
}

function recordResult(containerId: string, attemptId: string) {
  return api.post<RecordResultOutcome>(`${base(containerId)}/record/`, { attempt_id: attemptId });
}

export const quizGamification = { profiles, achievements, myState, leaderboard, recordResult };
