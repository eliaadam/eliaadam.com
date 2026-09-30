import { api } from "../../query/Api";

/** Typed client for `core.quiz_presentation`'s REST API (`/api/quiz-presentation/...`). */

export type PresentationMode = "formal" | "practice" | "survey" | "assessment" | "challenge" | "competition" | "game" | "simulation" | "adaptive";
export type NavigationStyle = "linear" | "free" | "random";

export interface PresentationProfile {
  id: string;
  name: string;
  mode: PresentationMode;
  navigation_style: NavigationStyle;
  theme_config: Record<string, unknown>;
  is_default: boolean;
}

export interface ResolvedPresentation {
  id: string | null;
  mode: PresentationMode;
  navigation_style: NavigationStyle;
  theme_config: Record<string, unknown>;
  is_default: boolean;
}

function base(containerId: string) {
  return `/api/quiz-presentation/containers/${containerId}`;
}

function profiles(containerId: string) {
  const b = `${base(containerId)}/profiles`;
  return {
    list: () => api.get<{ profiles: PresentationProfile[] }>(`${b}/`).then((r) => r.profiles),
    get: (profileId: string) => api.get<PresentationProfile>(`${b}/${profileId}/`),
    create: (input: { name: string; mode?: PresentationMode; navigation_style?: NavigationStyle; theme_config?: Record<string, unknown>; is_default?: boolean }) =>
      api.post<PresentationProfile>(`${b}/create/`, input),
    setDefault: (profileId: string) => api.post<PresentationProfile>(`${b}/${profileId}/set-default/`, {}),
  };
}

function assignToQuiz(containerId: string, quizId: string, profileId: string) {
  return api.post<{ assigned: true }>(`${base(containerId)}/quizzes/${quizId}/assign/`, { profile_id: profileId });
}

function resolveForQuiz(containerId: string, quizId: string) {
  return api.get<ResolvedPresentation>(`${base(containerId)}/quizzes/${quizId}/resolve/`);
}

export const quizPresentation = { profiles, assignToQuiz, resolveForQuiz };
