const API =
  import.meta.env.VITE_MAICORE_API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";

export type OwnerScope =
  | {
    type: "container";
    containerId: string;
  }
  | {
    type: "actor";
  };

export function scopeBase(scope: OwnerScope): string {
  if (scope.type === "container") {
    return `/containers/${scope.containerId}`;
  }

  return "";
}

export async function procurementApi<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = localStorage.getItem("maicore_token");

  const res = await fetch(`${API}/api/procurement${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",

      ...(token
        ? {
          Authorization: `Bearer ${token}`,
        }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) {
    return null as T;
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      json?.message ?? `HTTP ${res.status}`,
    ) as Error & {
      status?: number;
      errors?: unknown;
    };

    error.status = res.status;
    error.errors = json?.errors;

    throw error;
  }

  return (json?.data ?? json) as T;
}

export const toMajor = (
  minor: number | null | undefined,
): string => {
  if (minor === null || minor === undefined) {
    return "0.00";
  }

  return (minor / 100).toFixed(2);
};

export const fmtDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};