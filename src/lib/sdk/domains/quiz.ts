import { api } from "../../query/Api";

/**
 * Typed client for `core.quiz`'s REST API (`/api/quiz/...`) — generic
 * structured interactions: questions, quizzes, attempts, and scoring.
 * Deliberately two different Question shapes: `Question` (admin, has
 * the answer key) and `PublicQuestion` (taking a quiz — never has it).
 * Never call the admin endpoints from a "take this quiz" screen.
 */

export type InteractionType = "single_select" | "multi_select" | "text" | "numeric";
export type AttemptStatus = "in_progress" | "submitted" | "evaluated";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  interaction_type: InteractionType;
  options: QuestionOption[];
  correct_option_ids: string[];
  numeric_answer: number | null;
  numeric_tolerance: number;
  points: number;
  is_active: boolean;
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  interaction_type: InteractionType;
  options: QuestionOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
}

export interface QuizQuestionAdmin extends Question {
  quiz_question_id: string;
  position: number;
}

export interface QuizQuestionPublic extends PublicQuestion {
  quiz_question_id: string;
  position: number;
  points: number;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  actor_id: string;
  status: AttemptStatus;
  possible_points: number;
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  evaluated_at: string | null;
}

export type ResponseValue = { option_id: string } | { option_ids: string[] } | { text: string } | { value: number };

export interface AttemptResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  response_value: ResponseValue;
  points_possible: number;
  requires_manual_grading: boolean;
  is_correct: boolean | null;
  points_earned: number | null;
  manual_feedback: string;
  graded_at: string | null;
  responded_at: string | null;
}

function questions(containerId: string) {
  const base = `/api/quiz/containers/${containerId}/questions`;
  return {
    list: (activeOnly = false) => api.get<{ questions: Question[] }>(`${base}/${activeOnly ? "?active_only=true" : ""}`).then((r) => r.questions),
    get: (questionId: string) => api.get<Question>(`${base}/${questionId}/`),
    create: (input: {
      prompt: string; interaction_type: InteractionType; options?: QuestionOption[]; correct_option_ids?: string[];
      numeric_answer?: number; numeric_tolerance?: number; points?: number;
    }) => api.post<Question>(`${base}/create/`, input),
    update: (questionId: string, changes: Partial<Pick<Question, "prompt" | "options" | "correct_option_ids" | "numeric_answer" | "numeric_tolerance" | "points">>) =>
      api.post<Question>(`${base}/${questionId}/update/`, changes),
    deactivate: (questionId: string) => api.post<Question>(`${base}/${questionId}/deactivate/`, {}),
  };
}

function quizzes(containerId: string) {
  const base = `/api/quiz/containers/${containerId}/quizzes`;
  return {
    list: (activeOnly = false) => api.get<{ quizzes: Quiz[] }>(`${base}/${activeOnly ? "?active_only=true" : ""}`).then((r) => r.quizzes),
    get: (quizId: string) => api.get<Quiz>(`${base}/${quizId}/`),
    create: (input: { title: string; description?: string }) => api.post<Quiz>(`${base}/create/`, input),
    update: (quizId: string, changes: Partial<Pick<Quiz, "title" | "description">>) => api.post<Quiz>(`${base}/${quizId}/update/`, changes),
    activate: (quizId: string) => api.post<Quiz>(`${base}/${quizId}/activate/`, {}),
    deactivate: (quizId: string) => api.post<Quiz>(`${base}/${quizId}/deactivate/`, {}),
    questionsAdmin: (quizId: string) =>
      api.get<{ questions: QuizQuestionAdmin[] }>(`${base}/${quizId}/questions/`).then((r) => r.questions),
    questionsPublic: (quizId: string) =>
      api.get<{ questions: QuizQuestionPublic[] }>(`${base}/${quizId}/take/questions/`).then((r) => r.questions),
    addQuestion: (quizId: string, input: { question_id: string; position: number; points_override?: number }) =>
      api.post<{ id: string; question_id: string; position: number; points_override: number | null }>(`${base}/${quizId}/questions/add/`, input),
    removeQuestion: (quizId: string, questionId: string) => api.post<{ removed: true }>(`${base}/${quizId}/questions/${questionId}/remove/`, {}),
    attempts: (quizId: string) => api.get<{ attempts: Attempt[] }>(`${base}/${quizId}/attempts/`).then((r) => r.attempts),
    startAttempt: (quizId: string) => api.post<Attempt>(`${base}/${quizId}/take/start/`, {}),
  };
}

function attemptsAdmin(containerId: string) {
  const base = `/api/quiz/containers/${containerId}/attempts`;
  return {
    get: (attemptId: string) => api.get<Attempt>(`${base}/${attemptId}/`),
    responses: (attemptId: string) => api.get<{ responses: AttemptResponse[] }>(`${base}/${attemptId}/responses/`).then((r) => r.responses),
    gradeResponse: (attemptId: string, questionId: string, pointsEarned: number, feedback?: string) =>
      api.post<AttemptResponse>(`${base}/${attemptId}/questions/${questionId}/grade/`, { points_earned: pointsEarned, feedback }),
  };
}

function myAttempts(containerId: string) {
  const base = `/api/quiz/containers/${containerId}/my-attempts`;
  return {
    list: () => api.get<{ attempts: Attempt[] }>(`${base}/`).then((r) => r.attempts),
    get: (attemptId: string) => api.get<Attempt>(`${base}/${attemptId}/`),
    responses: (attemptId: string) => api.get<{ responses: AttemptResponse[] }>(`${base}/${attemptId}/responses/`).then((r) => r.responses),
    respond: (attemptId: string, questionId: string, responseValue: ResponseValue) =>
      api.post<AttemptResponse>(`${base}/${attemptId}/respond/`, { question_id: questionId, response_value: responseValue }),
    submit: (attemptId: string) => api.post<Attempt>(`${base}/${attemptId}/submit/`, {}),
  };
}

export const quiz = { questions, quizzes, attemptsAdmin, myAttempts };
