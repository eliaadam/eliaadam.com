const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function faithApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/faith${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(j.message ?? `HTTP ${res.status}`); e.status = res.status; throw e; }
  return j.data ?? j;
}

export const toMajor = (m: number) => (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
