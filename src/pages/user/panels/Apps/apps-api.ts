// Shared fetch helper for Apps panels. Base /api/apps.
const API = import.meta.env.VITE_PLATFORM_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function appsApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/apps${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(j.message ?? `HTTP ${res.status}`); e.status = res.status; throw e; }
  return j.data ?? j;
}
