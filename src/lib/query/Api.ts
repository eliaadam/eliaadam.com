import { getAuthToken } from "../other/authToken";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// Exported so other modules that need to make a raw fetch() call
// outside the JSON-only api.get()/api.post() shape (e.g. multipart
// file uploads — see src/lib/sdk/domains/avatars.ts) hit the SAME
// origin as every other request, instead of duplicating this
// fallback logic and risking it drifting out of sync.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://sysc.sonicpesa.com";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    // Non-JSON response.
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request to ${url} failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return (body as Envelope<T>)?.data ?? (body as T);
}

async function uploadMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    // Non-JSON response.
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request to ${url} failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return (body as Envelope<T>)?.data ?? (body as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),

  // multipart/form-data uploads — a genuinely different request shape
  // from the JSON-only methods above (no Content-Type header set
  // manually; the browser sets the correct multipart boundary itself
  // when given a FormData body). Used for anything that uploads real
  // file bytes: avatars, inventory branding assets, etc.
  uploadMultipart,
};
