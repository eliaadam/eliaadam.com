import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Capability, Container, Mapping } from "./registry/types";

export function MapPanel({ cap }: { cap: Capability }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [mode, setMode] = useState<"role_required" | "open_to_members">(
    "role_required",
  );
  const [msg, setMsg] = useState<string | null>(null);

  const mappingsQuery = useQuery({
    queryKey: ["capability-containers", cap.code],
    queryFn: () => api("GET", `/authority/capabilities/${cap.code}/containers`),
  });
  const containersQuery = useQuery({
    queryKey: ["containers"],
    queryFn: () => api("GET", "/hierarchy/containers"),
    enabled: picking,
  });

  const mappings: Mapping[] = Array.isArray(mappingsQuery.data)
    ? mappingsQuery.data
    : [];
  const allContainers: Container[] = Array.isArray(containersQuery.data)
    ? containersQuery.data
    : (containersQuery.data?.data ?? []);
  const alreadyMapped = new Set(mappings.map((m) => m.container_id));
  const available = allContainers.filter((c) => !alreadyMapped.has(c.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["capability-containers", cap.code] });
    qc.invalidateQueries({ queryKey: ["capabilities"] });
  };

  const map = useMutation({
    mutationFn: () =>
      api("POST", `/authority/capabilities/${cap.code}/containers`, {
        container_ids: chosen,
        access_mode: mode,
      }),
    onSuccess: (r: any) => {
      setMsg(`Enabled for ${r?.mapped ?? chosen.length} container(s).`);
      setChosen([]);
      setPicking(false);
      invalidate();
    },
    onError: (e: any) => setMsg(e.errors?.code?.[0] ?? e.message),
  });

  const update = useMutation({
    mutationFn: (v: { containerId: string; patch: Record<string, unknown> }) =>
      api(
        "PATCH",
        `/authority/capabilities/${cap.code}/containers/${v.containerId}`,
        v.patch,
      ),
    onSuccess: () => {
      setMsg(null);
      invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const unmap = useMutation({
    mutationFn: (containerId: string) =>
      api(
        "DELETE",
        `/authority/capabilities/${cap.code}/containers/${containerId}`,
      ),
    onSuccess: () => {
      setMsg(
        "Disabled. Existing data is untouched — only access is withdrawn.",
      );
      invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div>
      <div className="mb-4">
        {!picking ? (
          <button
            onClick={() => setPicking(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + Enable for containers
          </button>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-black dark:text-white m-0">
                Choose containers
              </p>
              <button
                onClick={() => {
                  setPicking(false);
                  setChosen([]);
                }}
                className="text-xs text-neutral-400"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-100 dark:border-neutral-900 mb-2">
              {containersQuery.isLoading ? (
                <p className="text-xs text-neutral-400 p-3 m-0">Loading…</p>
              ) : available.length === 0 ? (
                <p className="text-xs text-neutral-400 p-3 m-0">
                  Every container already has this capability.
                </p>
              ) : (
                available.map((c, i) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-2.5 sm:py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                      i > 0
                        ? "border-t border-neutral-100 dark:border-neutral-900"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(c.id)}
                      onChange={(e) =>
                        setChosen((prev) =>
                          e.target.checked
                            ? [...prev, c.id]
                            : prev.filter((x) => x !== c.id),
                        )
                      }
                    />
                    <span className="text-sm text-black dark:text-white">
                      {c.display_name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {c.code}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              >
                <option value="role_required">Role required</option>
                <option value="open_to_members">Open to members</option>
              </select>
              <button
                onClick={() => chosen.length && map.mutate()}
                disabled={map.isPending || chosen.length === 0}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                Enable for {chosen.length || "…"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2 mb-0">
              <strong>Open to members</strong> grants every member of the
              container this capability's permissions without a role. Use it
              deliberately.
            </p>
          </div>
        )}
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mb-3 m-0">{msg}</p>}

      {mappingsQuery.isLoading ? (
        <p className="text-sm text-neutral-400">Loading containers…</p>
      ) : mappings.length === 0 ? (
        <p className="text-sm text-neutral-400">Not enabled anywhere yet.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {mappings.map((m, i) => (
            <div
              key={m.container_id}
              className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              } ${m.enabled ? "" : "opacity-50"}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-black dark:text-white m-0 truncate">
                  {m.container_display_name}
                </p>
                <p className="text-[10px] font-mono text-neutral-400 m-0 truncate">
                  {m.container_code}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <select
                  value={m.access_mode}
                  onChange={(e) =>
                    update.mutate({
                      containerId: m.container_id,
                      patch: { access_mode: e.target.value },
                    })
                  }
                  className="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                >
                  <option value="role_required">Role required</option>
                  <option value="open_to_members">Open</option>
                </select>
                <button
                  onClick={() =>
                    update.mutate({
                      containerId: m.container_id,
                      patch: { enabled: !m.enabled },
                    })
                  }
                  className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  {m.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => unmap.mutate(m.container_id)}
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
