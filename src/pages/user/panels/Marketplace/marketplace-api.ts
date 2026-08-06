
// Shared marketplace API helper (extends the existing one with order methods).
const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
export async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
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
export const marketplaceApi = {
  createOrder: (
    containerId: string,
    b: { listing_id: string; quantity?: number },
  ) => api("POST", `marketplace/containers/${containerId}/orders`, b),

  pay: (
    containerId: string,
    orderId: string,
    b: {
      gateway?: string;
      buyer_name?: string;
      buyer_email?: string;
      buyer_phone?: string;
    },
  ) => api("POST", `marketplace/containers/${containerId}/orders/${orderId}/pay`, b),
};

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
