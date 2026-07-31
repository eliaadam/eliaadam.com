// Shared fetch helper for the logistics panels. Mirrors the app's api() pattern:
// Bearer from localStorage, JSON in/out, throws on non-2xx with the server message.
const API = import.meta.env.VITE_API_URL ?? "";

export async function logisticsApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/v1/logistics${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}
