
import type { Actor } from "./system-sdk";

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