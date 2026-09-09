import { getAuthToken } from "../../other/authToken";
import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.form`'s REST API
 * (`/api/form/...`).
 *
 * Response shapes: list endpoints (`listForms`, `listResponses`)
 * return `{"data": [...]}`, auto-unwrapped by `api.get()`. Single-item
 * endpoints (create/get/update/publish/close/archive/submit) return
 * the projection flattened directly at the top level — no wrapper.
 */

export type FieldType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "date"
  | "document";

export interface Choice {
  id: string;
  label: string;
}

export interface FieldConfig {
  max_length?: number;
  choices?: Choice[];
  min?: number;
  max?: number;
  max_size_bytes?: number;
  allowed_content_types?: string[];
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  help_text: string | null;
  config: FieldConfig;
}

export interface FormRecord {
  id: string;
  container_id: string;
  owner_actor_id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed" | "archived";
  fields: FormField[];
  allow_multiple_responses_per_actor: boolean;
  require_authentication: boolean;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface FormAnswer {
  field_id: string;
  value: unknown;
}

export interface FormResponseRecord {
  id: string;
  form_id: string;
  container_id: string;
  respondent_actor_id: string | null;
  answers: FormAnswer[];
  submitted_at: string | null;
  metadata: Record<string, unknown>;
}

export interface FieldInput {
  id?: string;
  type: FieldType;
  label: string;
  required?: boolean;
  help_text?: string;
  config?: FieldConfig;
}

export interface CreateFormInput {
  container_id: string;
  owner_actor_id: string;
  title: string;
  description?: string;
  fields?: FieldInput[];
  allow_multiple_responses_per_actor?: boolean;
  require_authentication?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateFormInput {
  title?: string;
  description?: string;
  fields?: FieldInput[];
  allow_multiple_responses_per_actor?: boolean;
  require_authentication?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AnswerInput {
  field_id: string;
  value: unknown;
}

/** Thrown on a 400 with a per-field `errors` map — see the backend's
 * `AnswerValidationError`. Distinguished from a generic `ApiError` so
 * the fill-out form can show errors next to the specific fields that
 * failed, not just a toast. */
export class FormValidationError extends Error {
  errors: Record<string, string>;
  constructor(message: string, errors: Record<string, string>) {
    super(message);
    this.name = "FormValidationError";
    this.errors = errors;
  }
}

async function listForms(containerId: string): Promise<FormRecord[]> {
  return api.get<FormRecord[]>(`/api/form/forms/?container_id=${containerId}`);
}

function getForm(id: string): Promise<FormRecord> {
  return api.get<FormRecord>(`/api/form/forms/${id}/`);
}

function createForm(input: CreateFormInput): Promise<FormRecord> {
  return api.post<FormRecord>("/api/form/forms/", input);
}

function updateForm(id: string, input: UpdateFormInput): Promise<FormRecord> {
  return api.patch<FormRecord>(`/api/form/forms/${id}/`, input);
}

function publishForm(id: string, actorId: string): Promise<FormRecord> {
  return api.post<FormRecord>(`/api/form/forms/${id}/publish/`, {
    actor_id: actorId,
  });
}

function closeForm(id: string, actorId: string): Promise<FormRecord> {
  return api.post<FormRecord>(`/api/form/forms/${id}/close/`, {
    actor_id: actorId,
  });
}

function archiveForm(id: string): Promise<FormRecord> {
  return api.post<FormRecord>(`/api/form/forms/${id}/archive/`);
}

async function listResponses(
  formId: string,
  limit = 100,
  offset = 0,
): Promise<FormResponseRecord[]> {
  return api.get<FormResponseRecord[]>(
    `/api/form/forms/${formId}/responses/?limit=${limit}&offset=${offset}`,
  );
}

/** Plain JSON submission — use only when the form has no `document`
 * fields. Forms with a document field must use `submitResponseWithFiles`
 * instead, since a document answer needs actual file bytes attached.
 *
 * NOTE: unlike `submitResponseWithFiles` (which parses the response
 * itself via a direct `fetch` and can reliably surface a
 * `FormValidationError`), this goes through the shared `api.post()`
 * wrapper, whose exact error shape wasn't inspected in this session —
 * a validation failure here surfaces as whatever `api.post` normally
 * throws, not necessarily a `FormValidationError`. Callers on this
 * path should fall back to showing `error.message` rather than
 * assuming `.errors` is available. */
function submitResponse(
  formId: string,
  input: {
    answers: AnswerInput[];
    respondent_actor_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<FormResponseRecord> {
  return api.post<FormResponseRecord>(
    `/api/form/forms/${formId}/responses/`,
    input,
  );
}

/** Multipart submission — required whenever the form has at least one
 * `document`-type field. Non-document answers travel as a
 * JSON-encoded "answers" text field; each document answer is a file
 * named `document_<field_id>`, matching the backend view's exact
 * parsing convention.
 *
 * IMPLEMENTATION NOTE: this bypasses the shared `api` wrapper and
 * calls `fetch` directly, since `lib/query/Api.ts` has no
 * FormData-aware method — every other call in this SDK sends a JSON
 * body. Confirmed against the real `Api.ts`/`lib/other/authToken.ts`:
 * uses the same `getAuthToken()` helper (token stored under
 * `"sysc.auth.token"`) rather than a guessed localStorage key — an
 * earlier version of this function guessed `"access_token"`, which
 * was wrong and silently sent no Authorization header at all. If
 * `Api.ts` ever gains a proper multipart-aware method, switch this to
 * use it instead of duplicating the auth-header logic here. */
async function submitResponseWithFiles(
  formId: string,
  input: {
    answers: AnswerInput[];
    respondent_actor_id?: string;
    documentFiles: Record<string, File>;
  },
): Promise<FormResponseRecord> {
  const formData = new FormData();
  formData.append("answers", JSON.stringify(input.answers));
  if (input.respondent_actor_id) {
    formData.append("respondent_actor_id", input.respondent_actor_id);
  }
  for (const [fieldId, file] of Object.entries(input.documentFiles)) {
    formData.append(`document_${fieldId}`, file);
  }

  const token = getAuthToken();

  const response = await fetch(`/api/form/forms/${formId}/responses/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body && typeof body === "object" && "errors" in body) {
      throw new FormValidationError(
        (body as { error?: string }).error ?? "Validation failed",
        (body as { errors: Record<string, string> }).errors,
      );
    }
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${response.status}`,
    );
  }
  return body as FormResponseRecord;
}

export const form = {
  listForms,
  getForm,
  createForm,
  updateForm,
  publishForm,
  closeForm,
  archiveForm,
  listResponses,
  submitResponse,
  submitResponseWithFiles,
};
