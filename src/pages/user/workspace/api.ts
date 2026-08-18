import type { Workspace } from "./types";

export const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

export const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchWorkspace(containerId: string) {
    const res = await fetch(
        `${API}/api/hierarchy/containers/${containerId}/workspace`,
        {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${localStorage.getItem("use_token")}`,
            },
        },
    );
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err: any = new Error(body.message ?? `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    const json = await res.json();
    return json.data as Workspace;
}

/** Resolve a public slug to a container id. Returns null on miss. */
export async function resolveSlug(
    slug: string,
): Promise<{ id: string; type: string } | null> {
    const res = await fetch(
        `${API}/api/hierarchy/public/resolve/${encodeURIComponent(slug)}`,
        { headers: { Accept: "application/json" } },
    );
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) return null;
    if (body?.data?.redirect)
        return { id: `redirect:${body.data.redirect}`, type: "redirect" };
    if (body?.data?.id) return { id: body.data.id, type: body.data.type };
    return null;
}