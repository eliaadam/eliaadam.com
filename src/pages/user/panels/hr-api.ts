
const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function hrApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/hr${path}`, {
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

// Money helpers — compensation is stored in MINOR units (×100).
export const toMinor = (major: string | number) => Math.round(Number(major || 0) * 100);
export const toMajor = (minor: number) => (Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
