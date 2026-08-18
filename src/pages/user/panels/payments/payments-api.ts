// Shared client for the payment flows. Mirrors the app's existing api() helper:
// base URL from env, bearer token from localStorage, unwraps { data }.

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown, auth = true) {
    const token = auth ? localStorage.getItem("maicore_token") : null;
    const res = await fetch(`${API}/api/${path}`, {
        method,
        headers: {
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
        const e: any = new Error(j.message ?? `HTTP ${res.status}`);
        e.body = j;
        e.status = res.status;
        throw e;
    }
    return j.data ?? j;
}

export function money(minor: number, currency = "TZS") {
    return `${(minor / 100).toLocaleString()} ${currency}`;
}

// ── wallet deposit ───────────────────────────────────────────────
export const depositApi = {
    deposit: (b: {
        container_id: string;
        amount: number; // minor units
        currency?: string;
        gateway?: string;
        buyer_name?: string;
        buyer_email?: string;
        buyer_phone: string;
    }) => api("POST", "payments/deposit", b),
};

// ── generic intent status poll (auth) ────────────────────────────
export const intentApi = {
    status: (intentId: string) => api("GET", `payments/intents/${intentId}/status`),
    balance: (containerId: string, currency = "TZS") =>
        api("GET", `payments/wallets/${containerId}?currency=${currency}`),
};

// ── payment links (merchant, auth) ───────────────────────────────
export const linksApi = {
    create: (b: {
        container_id: string;
        title: string;
        category?: string;
        description?: string;
        amount?: number | null;
        currency?: string;
        mode?: "reusable" | "single_use";
        slug?: string;
    }) => api("POST", "payments/links", b),
    list: (
        containerId: string,
        filters?: { category?: string; search?: string; sort?: string; direction?: "asc" | "desc" },
    ) => {
        const params = new URLSearchParams({ container_id: containerId, ...filters });
        return api("GET", `payments/links?${params.toString()}`);
    },
    categories: (containerId: string) =>
        api("GET", `payments/links/categories?container_id=${containerId}`),
    checkSlug: (slug: string) =>
        api("GET", `payments/links/slug-check?slug=${encodeURIComponent(slug)}`),
    charges: (id: string) => api("GET", `payments/links/${id}/charges`),
    disable: (id: string) => api("POST", `payments/links/${id}/disable`),
};

// ── public link pay (NO auth) ────────────────────────────────────
export const publicPayApi = {
    view: (slug: string) => api("GET", `pay/${slug}`, undefined, false),
    pay: (
        slug: string,
        b: {
            payer_name?: string;
            payer_email?: string;
            payer_phone: string;
            amount?: number;
            gateway?: string;
        },
    ) => api("POST", `pay/${slug}`, b, false),
    status: (chargeToken: string) =>
        api("GET", `pay/charge/${chargeToken}/status`, undefined, false),
};


// ── marketplace checkout (auth) — single place-and-pay call ─────
// NOTE: the route is orders/{orderId}/pay for historical reasons, but the
// controller behind it (MarketplacePaymentService::checkout) creates a NEW
// order internally and ignores {orderId} entirely — see backend note below.
// "new" is a placeholder; any value works since the param isn't read.
export const marketplaceApi = {
    place: (
        containerId: string,
        b: {
            buyer_container_id: string;
            listing_id: string;
            quantity?: number;
            payment_method: "wallet" | "ussd";
            gateway?: "selcom" | "mpesa";
            buyer_name?: string;
            buyer_email?: string;
            buyer_phone?: string;
        },
    ) => api("POST", `marketplace/containers/${containerId}/orders/new/pay`, b),
};