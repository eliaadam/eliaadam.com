// Shared marketplace API helper (extends the existing one with order methods).
const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function marketplaceApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/marketplace${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(j.message ?? `HTTP ${res.status}`); e.status = res.status; throw e; }
  return j.data ?? j;
}

// Authenticated file download (keeps the Authorization header, unlike a raw link).
export async function marketplaceDownload(path: string, fallbackName = "download") {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/marketplace${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message ?? `HTTP ${res.status}`);
  }
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const name = match?.[1] ?? fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export const toMajor = (minor: number) => (minor / 100).toFixed(2);
