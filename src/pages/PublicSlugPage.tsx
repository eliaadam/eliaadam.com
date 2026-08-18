import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";

/*
 * Public landing for system.com/{slug}.
 *
 * Resolves the slug via the PUBLIC resolver (no auth). Three outcomes:
 *   · historical slug → the API returns a redirect target; we replace to it
 *   · live slug       → we know type + id, and show a minimal public stub
 *   · nothing         → 404-style "not found"
 *
 * IMPORTANT: resolving a slug gives IDENTITY ONLY. It is not authorization to
 * see the subject's data. This page shows only what a public visitor may see;
 * anything private stays behind the app's normal auth. "Open in workspace"
 * sends an authenticated user into the real workspace, where the Gate decides
 * what they can actually do.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

type Resolved =
  | { state: "loading" }
  | { state: "notfound" }
  | { state: "redirect"; to: string }
  | { state: "ok"; type: "container" | "actor"; id: string };

export default function PublicSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<Resolved>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const res = await fetch(
          `${API}/api/hierarchy/public/resolve/${encodeURIComponent(slug ?? "")}`,
          { headers: { Accept: "application/json" } },
        );

        // The API sends 301 with a redirect target for historical slugs. fetch
        // follows redirects transparently by default, so we detect the redirect
        // via the payload shape instead of the status.
        const body = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.status === 404) {
          setResult({ state: "notfound" });
          return;
        }
        if (body?.data?.redirect) {
          setResult({ state: "redirect", to: body.data.redirect });
          return;
        }
        if (body?.data?.type && body?.data?.id) {
          setResult({ state: "ok", type: body.data.type, id: body.data.id });
          return;
        }
        setResult({ state: "notfound" });
      } catch {
        if (!cancelled) setResult({ state: "notfound" });
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (result.state === "loading") {
    return (
      <div style={wrap}>
        <div style={spinner} />
      </div>
    );
  }

  if (result.state === "redirect") {
    // Old address → canonical one, client-side.
    return <Navigate to={`/${result.to}`} replace />;
  }

  if (result.state === "notfound") {
    return (
      <div style={wrap}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>
            Address not found
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              margin: "0 0 1.5rem",
            }}
          >
            No page is registered at <code>/{slug}</code>.
          </p>
          <a href="/" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            ← Home
          </a>
        </div>
      </div>
    );
  }

  // result.state === "ok" — minimal public stub. Expand later into a real
  // public profile that reads a publish flag on the subject.
  const isContainer = result.type === "container";
  const token = localStorage.getItem("use_token");

  return (
    <div style={wrap}>
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          {isContainer ? "🏢" : "👤"}
        </div>
        <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.25rem" }}>
          system.com/{slug}
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.8125rem",
            margin: "0 0 1.5rem",
          }}
        >
          This {isContainer ? "container" : "person"} has a public address on
          Platform. Public profile pages are coming soon.
        </p>

        {isContainer &&
          (token ? (
            <button
              // Enter the workspace by id. The workspace sees the container has
              // a slug and canonicalises the URL to /{slug}/{panel} on load, so
              // the address bar ends up on the vanity URL either way. Going via
              // the id avoids navigating to /{slug} — the page we're already on.
              onClick={() => navigate(`/u/workspace/${result.id}`)}
              style={btn}
            >
              Open in workspace
            </button>
          ) : (
            <button onClick={() => navigate("/login")} style={btn}>
              Sign in to open
            </button>
          ))}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "1.5rem",
};
const btn: React.CSSProperties = {
  padding: "0.625rem 1rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  borderRadius: 8,
  background: "#000",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
const spinner: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #e5e7eb",
  borderTopColor: "#3b82f6",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
};
