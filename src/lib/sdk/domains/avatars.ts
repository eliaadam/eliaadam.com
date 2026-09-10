import { api } from "../../query/Api";
import type { Actor } from "./identity";

/**
 * Avatar upload — multipart/form-data. Uses the shared
 * `api.uploadMultipart()` (Api.ts) rather than its own private copy —
 * that logic used to be duplicated here; consolidated once
 * inventory.ts needed the exact same thing for branding uploads.
 */

// -- My own avatar (Profile page) ------------------------------------------

function setMyAvatar(file: File): Promise<Actor> {
  const formData = new FormData();
  formData.append("avatar", file);
  return api.uploadMultipart<Actor>(
    "/api/identity/actors/me/avatar/",
    formData,
  );
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
  return api.uploadMultipart(
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
