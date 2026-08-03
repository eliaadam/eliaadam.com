import { throwForStatus, MaicoreNetworkError } from "./errors.js";
import type { IdentityEnvelope, DataEnvelope } from "./types.js";

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface MaicoreClientConfig {

  baseUrl: string;

  token?: string | (() => string | null | undefined | Promise<string | null | undefined>);

  headers?: Record<string, string>;

  fetchImpl?: typeof fetch;

  timeoutMs?: number;

  useSanctumCookies?: boolean;

  debug?: boolean;

  onUnauthorized?: () => void;
}

function buildQuery(params?: object | null): string {
  if (!params) {
    return "";
  }

  const entries = Object.entries(params as Record<string, unknown>);
  const usable = entries.filter(([, v]) => v !== undefined && v !== null);

  if (usable.length === 0) {
    return "";
  }

  const qs = new URLSearchParams();

  for (const [k, v] of usable) {
    qs.set(k, String(v));
  }

  return `?${qs.toString()}`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

  return match ? decodeURIComponent(match[1]) : null;
}

function maskToken(token: string | null | undefined): string {
  if (!token) {
    return "(none)";
  }

  if (token.length <= 8) {
    return "***";
  }

  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly useSanctumCookies: boolean;
  private readonly debug: boolean;
  private readonly onUnauthorized?: () => void;
  private token?: MaicoreClientConfig["token"];
  private csrfReady = false;

  constructor(config: MaicoreClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.headers = config.headers ?? {};

    const fetchImpl = config.fetchImpl ?? globalThis.fetch?.bind(globalThis);


    this.fetchImpl = fetchImpl;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.useSanctumCookies = config.useSanctumCookies ?? true;
    this.token = config.token;
    this.onUnauthorized = config.onUnauthorized;
    this.debug =
      config.debug ??
      (typeof import.meta !== "undefined" && Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV));
  }


  setToken(token: MaicoreClientConfig["token"]): void {
    this.token = token;

    if (this.debug) {
      console.log(
        "[system-sdk] setToken called ->",
        typeof token === "function" ? "(token function)" : maskToken(token ?? null),
      );
    }
  }

  private async resolveToken(): Promise<string | null | undefined> {
    if (typeof this.token === "function") {
      return await this.token();
    }

    return this.token;
  }

  async ensureCsrfCookie(): Promise<void> {
    if (!this.useSanctumCookies || this.csrfReady) {
      return;
    }

    await this.fetchImpl(`${this.baseUrl}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    this.csrfReady = true;

    if (this.debug) {
      console.log("[system-sdk] CSRF cookie ensured, XSRF-TOKEN =", maskToken(readCookie("XSRF-TOKEN")));
    }
  }

  private async request<T>(
    method: string,
    path: string,
    opts: {
      body?: unknown;
      query?: object;
      unwrap?: "identity" | "data" | "raw";
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${buildQuery(opts.query)}`;
    const token = await this.resolveToken();

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (this.useSanctumCookies) {
      const xsrfToken = readCookie("XSRF-TOKEN");

      if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = xsrfToken;
      }
    }

    if (this.debug) {
      console.groupCollapsed(`[system-sdk] ${method} ${path}`);
      console.log("url:", url);
      console.log("token resolved:", maskToken(token));
      console.log("Authorization header set:", Boolean(headers.Authorization));
      console.log("X-XSRF-TOKEN header set:", Boolean(headers["X-XSRF-TOKEN"]));
      console.groupEnd();
    }

    const controller = this.timeoutMs > 0 ? new AbortController() : undefined;
    const timer =
      controller && this.timeoutMs > 0
        ? setTimeout(() => controller.abort(), this.timeoutMs)
        : undefined;

    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        credentials: this.useSanctumCookies ? "include" : "same-origin",
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller?.signal,
      });
    } catch (err) {
      if (this.debug) {
        console.error(`[system-sdk] ${method} ${path} network error:`, err);
      }

      throw new MaicoreNetworkError(
        `Network request to ${url} failed: ${(err as Error).message}`,
        url,
        err
      );
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    if (this.debug) {
      console.log(`[system-sdk] ${method} ${path} ->`, response.status, response.ok ? "OK" : "FAILED");
    }

    if (!response.ok) {
      try {
        await throwForStatus(response, url);
      } catch (err) {
        if (response.status === 401) {
          if (this.debug) {
            console.warn(`[system-sdk] ${method} ${path} -> 401, invoking onUnauthorized()`);
          }

          this.onUnauthorized?.();
        }

        throw err;
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const unwrap = opts.unwrap ?? "raw";
    const json = await response.json().catch(() => undefined);

    if (unwrap === "identity") {
      return (json as IdentityEnvelope<T>)?.data as T;
    }

    if (unwrap === "data") {
      return (json as DataEnvelope<T>)?.data as T;
    }

    return json as T;
  }

  /** GET, unwrapping an Identity-domain `{success,data}` envelope. */
  getIdentity<T>(path: string, query?: object) {
    return this.request<T>("GET", path, { query, unwrap: "identity" });
  }
  /** POST, unwrapping an Identity-domain `{success,data}` envelope. */
  postIdentity<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body, unwrap: "identity" });
  }
  /** PUT, unwrapping an Identity-domain `{success,data}` envelope. */
  putIdentity<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body, unwrap: "identity" });
  }

  /** GET, unwrapping a `{data}` envelope (Hierarchy / Authority domains). */
  get<T>(path: string, query?: object) {
    return this.request<T>("GET", path, { query, unwrap: "data" });
  }
  /** POST, unwrapping a `{data}` envelope. */
  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body, unwrap: "data" });
  }
  /** PATCH, unwrapping a `{data}` envelope. */
  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body, unwrap: "data" });
  }
  /** PUT, unwrapping a `{data}` envelope. */
  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body, unwrap: "data" });
  }
  /** DELETE, unwrapping a `{data}` envelope (or void for 204). */
  delete<T = void>(path: string, body?: unknown) {
    return this.request<T>("DELETE", path, { body, unwrap: "data" });
  }

  /** Escape hatch: raw request, no envelope unwrapping (e.g. `{can: true}` shapes). */
  raw<T>(
    method: string,
    path: string,
    opts: { body?: unknown; query?: object } = {}
  ) {
    return this.request<T>(method, path, { ...opts, unwrap: "raw" });
  }
}