import { getAuthToken } from "../other/authToken";

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

interface Envelope<T> {
    data: T;
    meta?: Record<string, unknown>;
}

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "https://sysc.maishasoft.com";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getAuthToken();

    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
    });

    let body: unknown = null;

    try {
        body = await response.json();
    } catch {
        // Non-JSON response.
    }

    if (!response.ok) {
        const message =
            body &&
                typeof body === "object" &&
                "error" in body
                ? String((body as { error: unknown }).error)
                : `Request to ${url} failed with status ${response.status}`;

        throw new ApiError(message, response.status);
    }

    return (body as Envelope<T>)?.data ?? (body as T);
}

export const api = {
    get: <T>(path: string) =>
        request<T>(path),

    post: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(path: string) =>
        request<T>(path, {
            method: "DELETE",
        }),
};