import { api, API_BASE_URL, ApiError } from "../../query/Api";
import { getAuthToken } from "../../other/authToken";
import type { Actor } from "./identity";

/**
 * Avatar upload — multipart/form-data, deliberately NOT going through
 * `api.post()`, which always sends JSON. Uses `fetch()` directly
 * instead, but reuses `API_BASE_URL` and `getAuthToken` from the real
 * `Api.ts` rather than reinventing either.
 *
 * FIXED: this previously called `fetch("/api/...")` with a bare
 * relative path, which resolves against the CURRENT PAGE's own
 * origin — fine in local dev where frontend and API share an origin,
 * but wrong in production, where the frontend is served from a
 * different domain than the API (confirmed: requests were hitting
 * maishasoft.com instead of sysc.maishasoft.com). Every request now
 * goes through the same `API_BASE_URL` prefix `api.get()`/`api.post()`
 * already use, so it always hits the real API host regardless of
 * where the frontend itself happens to be served from.
 */
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

  // Matches Api.ts's own request()'s envelope-unwrap behavior exactly
  // ({"data": ...} or a bare body), for consistency.
  return (body as { data?: T })?.data ?? (body as T);
}

// -- My own avatar (Profile page) ------------------------------------------

function setMyAvatar(file: File): Promise<Actor> {
  const formData = new FormData();
  formData.append("avatar", file);
  return uploadMultipart<Actor>("/api/identity/actors/me/avatar/", formData);
}

function clearMyAvatar(): Promise<Actor> {
  return api.post<Actor>("/api/identity/actors/me/avatar/clear/");
}

function getMyAvatarUrl(): Promise<{ avatar_url: string | null }> {
  return api.get<{ avatar_url: string | null }>(
    "/api/identity/actors/me/avatar-url/",
  );
}

// -- A container's avatar (Container Settings page) ------------------------

function setContainerAvatar(
  containerId: string,
  file: File,
): Promise<{ container_id: string; avatar_file_id: string | null }> {
  const formData = new FormData();
  formData.append("avatar", file);
  return uploadMultipart(
    `/api/container/containers/${containerId}/avatar/`,
    formData,
  );
}

export const avatars = {
  setMyAvatar,
  clearMyAvatar,
  getMyAvatarUrl,
  setContainerAvatar,
};