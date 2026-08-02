const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function marketplaceApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/marketplace${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(j.message ?? `HTTP ${res.status}`); e.status = res.status; throw e; }
  return j.data ?? j;
}

// Inventory helper — used by the publish flow to list this container's offerings.
export async function inventoryApi(method: string, path: string) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/inventory${path}`, {
    method,
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  return j.data ?? j ?? [];
}

export const toMajor = (minor: number) => (Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
