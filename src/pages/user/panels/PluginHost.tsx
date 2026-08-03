import { useEffect, useRef, useState, useCallback } from "react";

/**
 * PluginHost — the TRUSTED side of the sandbox boundary.
 *
 * Loads a third-party plugin into a sandboxed iframe and is the ONLY thing that
 * talks to it (via postMessage). The plugin has no network access and no token;
 * it can only ask this host to make API calls on its behalf. This component:
 *
 *   1. renders the plugin in a locked-down <iframe sandbox> (no same-origin, no
 *      top navigation, scripts only)
 *   2. listens for postMessage requests from ONLY this iframe
 *   3. checks each request against the plugin's granted scopes (client mirror)
 *   4. forwards allowed calls to /api/v1 with the APP TOKEN (never given to the
 *      plugin) and returns the result
 *
 * SECURITY NOTES (review carefully):
 *   - The app token lives here, never in the iframe. The plugin cannot read it.
 *   - Client scope checks are a FAST FIRST LINE, not the boundary. The server
 *     Gate re-checks every call. Never rely on the client check alone.
 *   - We verify event.source === iframe.contentWindow so other frames/tabs can't
 *     inject messages.
 *   - The iframe uses `sandbox="allow-scripts"` WITHOUT `allow-same-origin`, so
 *     the plugin runs in an opaque origin and cannot reach cookies/localStorage
 *     or your DOM. Add capabilities only via explicit manifest opt-in.
 */

type PluginManifest = {
  id: string;
  name: string;
  app_slug: string;
  entry: string;
  requested_scopes: string[];
  sandbox?: { allow_forms?: boolean; allow_popups?: boolean };
};

type Props = {
  manifest: PluginManifest;
  containerId: string;
  grantedScopes: string[];
  appToken: string;
  apiBase?: string;
  height?: number;
};

const SCOPE_RULES: Record<string, { methods: string[]; prefix: RegExp }[]> = {
  "inventory.read": [{ methods: ["GET"], prefix: /^\/inventory\// }],
  "inventory.write": [
    { methods: ["GET", "POST", "PATCH"], prefix: /^\/inventory\// },
  ],
  "marketplace.read": [{ methods: ["GET"], prefix: /^\/marketplace\// }],
  "marketplace.publish": [
    { methods: ["GET", "POST", "PATCH"], prefix: /^\/marketplace\// },
  ],
};

function scopeAllows(scopes: string[], method: string, path: string): boolean {
  const m = method.toUpperCase();
  for (const scope of scopes) {
    const rules = SCOPE_RULES[scope] ?? [];
    for (const rule of rules) {
      if (rule.methods.includes(m) && rule.prefix.test(path)) return true;
    }
  }
  return false;
}

export default function PluginHost({
  manifest,
  containerId,
  grantedScopes,
  appToken,
  apiBase,
  height = 480,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error] = useState<string | null>(null);

  // Effective scopes = what the plugin asked for ∩ what the app actually holds.
  const effectiveScopes = manifest.requested_scopes.filter((s) =>
    grantedScopes.includes(s),
  );

  const base =
    (apiBase ??
      import.meta.env.VITE_MAICORE_API_URL ??
      "http://127.0.0.1:8000") + "/api/v1";

  const forward = useCallback(
    async (reqId: string, method: string, path: string, body: unknown) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      const reply = (payload: any) =>
        iframe.contentWindow!.postMessage(
          { __maicore: true, type: "response", reqId, ...payload },
          "*",
        );

      if (!path.startsWith("/"))
        return reply({
          ok: false,
          status: 400,
          error: "path must start with /",
        });

      if (!scopeAllows(effectiveScopes, method, path)) {
        return reply({
          ok: false,
          status: 403,
          error: "scope_denied",
          detail: `Not permitted by granted scopes: ${method} ${path}`,
        });
      }

      const scopedPath = path.replace(
        /^\/(inventory|marketplace)\/containers\/[^/]+/,
        (_m, cap) => `/${cap}/containers/${containerId}`,
      );

      try {
        const res = await fetch(base + scopedPath, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${appToken}`, // token stays host-side
          },
          body: body && method !== "GET" ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        reply({ ok: res.ok, status: res.status, data });
      } catch (e: any) {
        reply({
          ok: false,
          status: 0,
          error: "network_error",
          detail: e?.message,
        });
      }
    },
    [base, appToken, containerId, effectiveScopes],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only accept messages from THIS plugin's iframe.
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      )
        return;
      const msg = event.data;
      if (!msg || msg.__maicore !== true) return;

      if (msg.type === "ready") {
        setReady(true);
        // Hand the plugin its context (scopes + container) — NOT the token.
        iframeRef.current.contentWindow?.postMessage(
          {
            __maicore: true,
            type: "init",
            containerId,
            scopes: effectiveScopes,
            appSlug: manifest.app_slug,
          },
          "*",
        );
        return;
      }

      if (msg.type === "request" && typeof msg.reqId === "string") {
        forward(
          msg.reqId,
          String(msg.method || "GET"),
          String(msg.path || ""),
          msg.body,
        );
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [forward, containerId, effectiveScopes, manifest.app_slug]);

  if (effectiveScopes.length === 0) {
    return (
      <div className="p-4 text-sm text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-md">
        This plugin requests scopes the app isn't granted in this container.
        Install or grant the app first.
      </div>
    );
  }

  // Build the sandbox attribute. allow-scripts only by default; opt-ins added
  // explicitly. NEVER add allow-same-origin — it would break the origin
  // isolation that keeps the plugin out of your cookies/DOM.
  const sandbox = ["allow-scripts"];
  if (manifest.sandbox?.allow_forms) sandbox.push("allow-forms");
  if (manifest.sandbox?.allow_popups) sandbox.push("allow-popups");

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
      {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}
      {!ready && (
        <div className="px-3 py-2 text-xs text-neutral-400">
          Loading {manifest.name}…
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={manifest.entry}
        title={manifest.name}
        sandbox={sandbox.join(" ")}
        referrerPolicy="no-referrer"
        style={{ width: "100%", height, border: "0", display: "block" }}
      />
    </div>
  );
}
