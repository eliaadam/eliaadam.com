
import type { Actor } from "./maicore-sdk";

const ACTOR_KEY = "maicore_actor";
const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

export const queryKeys = {
  session: ["session"] as const,
  isAdmin: ["session", "isAdmin"] as const,
} as const;

/** Save actor to localStorage so we can restore it on refresh. */
export function persistActor(actor: Actor): void {
  try {
    localStorage.setItem(ACTOR_KEY, JSON.stringify(actor));
  } catch {
    // ignore
  }
}

export function clearActor(): void {
  localStorage.removeItem(ACTOR_KEY);
}

export async function fetchSession(): Promise<Actor | null> {
  const token = localStorage.getItem("maicore_token");
  if (!token) return null;

  // Restore from cached actor data — instant, no network.
  const cached = localStorage.getItem(ACTOR_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as Actor;
    } catch {
      // corrupt data — fall through
    }
  }

  return null;
}

/**
 * "System admin" is NOT a permission you check — it is a STATE: you hold a
 * wildcard role in the system container.
 *
 * The old version asked the Gate for resource "system" / action "admin", i.e.
 * permission "system.admin". That permission does not exist — the only
 * system-tier entry is the wildcard marker "system.*", which is not a checkable
 * permission. So the Gate always returned false and the System Admin button
 * never lit, even for a real admin.
 *
 * The backend endpoint answers the real question directly: does this actor hold
 * a wildcard in the system container? No permission code, no guessing, and it
 * cannot drift out of sync with what the Gate considers an admin.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const token = localStorage.getItem("maicore_token");
  if (!token) return false;

  try {
    const res = await fetch(`${API}/api/authority/me/system-access`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return false;

    const json = await res.json();
    return json.data?.is_system_admin === true;
  } catch {
    return false;
  }
}