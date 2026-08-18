import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Public Address (vanity URL) — a section for the container management panel.
 *
 * OPT-IN by design: a container has no public address until someone claims one.
 * The copy makes the tradeoff explicit — claiming makes the container reachable
 * at system.com/{slug}; until then it is private and UUID-addressed. Claiming
 * an address does NOT publish the container's data; it only makes it findable.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function PublicAddressSection({
  containerId,
}: {
  containerId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const debounced = useDebounced(draft, 350);

  const current = useQuery({
    queryKey: ["slug", containerId],
    queryFn: () => api("GET", `/hierarchy/containers/${containerId}/slug`),
  });

  const availability = useQuery({
    queryKey: ["slug-check", debounced],
    queryFn: () =>
      api(
        "GET",
        `/hierarchy/slugs/check?slug=${encodeURIComponent(debounced)}`,
      ),
    enabled: debounced.length >= 3,
  });

  const claim = useMutation({
    mutationFn: () =>
      api("PUT", `/hierarchy/containers/${containerId}/slug`, {
        slug: draft.trim(),
      }),
    onSuccess: (r: any) => {
      setMsg(
        r.status === "renamed"
          ? `Address changed. The old one (${r.previous}) now redirects here.`
          : "Public address set.",
      );
      setDraft("");
      qc.invalidateQueries({ queryKey: ["slug", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const release = useMutation({
    mutationFn: () =>
      api("DELETE", `/hierarchy/containers/${containerId}/slug`),
    onSuccess: () => {
      setMsg("Public address removed. This container is private again.");
      qc.invalidateQueries({ queryKey: ["slug", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const existing = current.data?.slug as string | null | undefined;
  const publicUrl = current.data?.public_url as string | null | undefined;

  const check = availability.data as
    | { available?: boolean; reason?: string }
    | undefined;
  const canClaim =
    draft.trim().length >= 3 && check?.available === true && !claim.isPending;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Public address
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Give this container a memorable public link. Optional — without one, the
        container stays private and is reached only by its internal ID. Setting
        an address makes it findable, not public: what visitors see is
        controlled separately.
      </p>

      {existing ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-black dark:text-white">
              {publicUrl}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
              live
            </span>
          </div>
          <button
            onClick={() => release.mutate()}
            disabled={release.isPending}
            className="text-[11px] text-amber-600 hover:underline"
          >
            Remove public address
          </button>
          <p className="text-[11px] text-neutral-400 mt-3 mb-1">
            Change to a new address:
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="flex items-center flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
          <span className="pl-3 pr-1 text-sm text-neutral-400 select-none">
            system.com/
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toLowerCase())}
            placeholder="acme-sacco"
            className="flex-1 py-2 pr-3 text-sm bg-transparent text-black dark:text-white outline-none"
          />
        </div>
        <button
          onClick={() => canClaim && claim.mutate()}
          disabled={!canClaim}
          className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {existing ? "Change" : "Claim"}
        </button>
      </div>

      {/* Live availability feedback */}
      {draft.trim().length >= 3 && (
        <p className="text-[11px] mt-2 m-0">
          {availability.isFetching ? (
            <span className="text-neutral-400">Checking…</span>
          ) : check?.available ? (
            <span className="text-emerald-600">
              ✓ system.com/{draft.trim()} is available
            </span>
          ) : (
            <span className="text-amber-600">
              ✕ {check?.reason ?? "Unavailable"}
            </span>
          )}
        </p>
      )}

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}
