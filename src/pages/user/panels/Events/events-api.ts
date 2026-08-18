const API = import.meta.env.VITE_MAICORE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type OwnerScope = { type: "container"; containerId: string } | { type: "actor" };

/** Container scope nests under /containers/{id}; actor scope uses the bare
 *  /events/mine paths — mirrors the split routes on the backend exactly. */
export function scopeBase(scope: OwnerScope): string {
    return scope.type === "container" ? `/containers/${scope.containerId}/events` : "/mine";
}

export async function eventsApi(method: string, path: string, body?: unknown) {
    const token = localStorage.getItem("sindano_token");
    const res = await fetch(`${API}/api/events${path}`, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
        const e: any = new Error(j.message ?? `HTTP ${res.status}`);
        e.status = res.status;
        throw e;
    }
    return j.data ?? j;
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");

export const STATUS_STYLE: Record<string, string> = {
    draft: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500",
    published: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    cancelled: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    completed: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
};