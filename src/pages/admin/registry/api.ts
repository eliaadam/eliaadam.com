const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

/** Legacy-shaped call used by the capability/RBAC endpoints (Authority + Hierarchy). */
export async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.errors = j.errors;
    throw e;
  }
  return j.data ?? j;
}

/** Registry-scoped call (assets, versions, documents, doc categories). */
export async function apiFetch<T>(
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}/api/registry${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${localStorage.getItem("sindano_token")}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const respBody = await res.json().catch(() => ({}));
    const err: any = new Error(respBody.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.errors = respBody.errors;
    throw err;
  }
  return res.json();
}

export function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "all" && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");

  return q ? `?${q}` : "";
}
