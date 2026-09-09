import { api } from "../../query/Api";
import { ApiError } from "../../query/Api";
import type { Actor } from "./identity";

/**
 * Avatar upload — multipart/form-data, deliberately NOT going through
 * `api.post()`, which sends JSON. Uses `fetch()` directly instead.
 *
 * ASSUMPTION FLAGGED, needs verification: the Bearer token is read
 * from `localStorage` under the key "access_token" — this matches the
 * most common convention in this codebase (ContainerContext.tsx's own
 * confirmed localStorage-based persistence for the current container
 * ID), but the EXACT key name `api.post()`/`api.get()` themselves use
 * internally hasn't been independently confirmed this session. If
 * uploads fail with a 401 despite being logged in, this is the first
 * thing to check — open Api.ts and match whatever key it actually
 * reads the token from.
 */
function getAuthToken(): string | null {
  return localStorage.getItem("access_token");
}

async function uploadMultipart<T>(url: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
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
