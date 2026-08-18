import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PublicAddressSection from "./PublicAddressSection";
import Section from "./ContainerManagement/Section";
import Msg from "./ContainerManagement/Msg";
import ContainerCredentialsSection from "./ContainerManagement/ContainerCredentialsSection";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(`${API}/api/hierarchy${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}

type MovePreview = {
  container: { id: string; display_name: string };
  new_parent: { id: string; display_name: string };
  subtree_size: number;
  losing_access: { actor_id: string; via_container: string }[];
  gaining_access: { actor_id: string; via_container: string }[];
};

export default function ContainerManagementPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (a: string) =>
    permissions.includes(`system.hierarchy.container.${a}`);

  const tabs: { key: string; label: string; show: boolean }[] = [
    { key: "general", label: "General", show: can("rename") },
    {
      key: "structure",
      label: "Structure",
      show: can("create_child") || can("move"),
    },
    {
      key: "lifecycle",
      label: "Lifecycle",
      show: can("archive") || can("restore"),
    },
    { key: "credentials", label: "Login", show: can("rename") },
  ].filter((t) => t.show);

  const [tab, setTab] = useState<string>(tabs[0]?.key ?? "general");

  if (tabs.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        You don't hold any container-management permissions here.
      </p>
    );
  }

  return (
    <div className="max-w-2xl" style={{ fontSize: "var(--ux-font-base)" }}>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                on
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <div className="space-y-5">
          {can("rename") && <RenameSection containerId={containerId} />}
          {can("rename") && <PublicAddressSection containerId={containerId} />}
          {can("rename") && <PresentationSection containerId={containerId} />}
        </div>
      )}
      {tab === "credentials" && (
        <div className="space-y-5">
          <ContainerCredentialsSection containerId={containerId} />
        </div>
      )}
      {tab === "structure" && (
        <div className="space-y-5">
          {can("create_child") && (
            <CreateChildSection containerId={containerId} />
          )}
          {can("move") && <MoveSection containerId={containerId} />}
        </div>
      )}

      {tab === "lifecycle" && (
        <div className="space-y-5">
          <ArchiveSection
            containerId={containerId}
            canArchive={can("archive")}
            canRestore={can("restore")}
          />
        </div>
      )}
    </div>
  );
}

/* ── RENAME ───────────────────────────────────────────────────────── */

function RenameSection({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const rename = useMutation({
    mutationFn: () =>
      api("PATCH", `/containers/${containerId}/name`, {
        display_name: name.trim(),
      }),
    onSuccess: () => {
      setMsg("Renamed.");
      setName("");
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <Section
      title="Rename container"
      subtitle="Changes the display name everywhere it appears."
    >
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New name"
          className={inputClass}
        />
        <button
          onClick={() => name.trim() && rename.mutate()}
          disabled={rename.isPending || !name.trim()}
          className={primaryBtn}
        >
          Rename
        </button>
      </div>
      {msg && <Msg text={msg} />}
    </Section>
  );
}

/* ── PRESENTATION (UX template) ───────────────────────────────────── */

function PresentationSection({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["ux-template", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/ux-template`),
  });

  const set = useMutation({
    mutationFn: (code: string | null) =>
      api("PUT", `/containers/${containerId}/ux-template`, {
        template_code: code,
      }),
    onSuccess: (_d, code) => {
      setMsg(
        code === null
          ? "Cleared — this container now inherits its parent's presentation."
          : "Presentation updated. Reload the workspace to see the new layout.",
      );
      qc.invalidateQueries({ queryKey: ["ux-template", containerId] });
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const own = q.data?.own as string | null | undefined;
  const effective = q.data?.effective as string | undefined;
  const available: {
    code: string;
    display_name: string;
    description: string | null;
    is_default: boolean;
  }[] = Array.isArray(q.data?.available) ? q.data.available : [];

  return (
    <Section
      title="Presentation"
      subtitle="How this container's workspace is laid out. Purely visual — it never changes what anyone can do. Children inherit this unless they set their own."
    >
      {q.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {available.map((t) => {
              const selected = own === t.code;
              return (
                <button
                  key={t.code}
                  onClick={() => set.mutate(t.code)}
                  disabled={set.isPending}
                  className={`text-left rounded-lg border p-3 transition ${
                    selected
                      ? "border-black dark:border-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-black dark:text-white">
                      {t.display_name}
                    </span>
                    {t.is_default && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                        default
                      </span>
                    )}
                    {selected && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                        set here
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      {t.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-400 m-0">
              {own
                ? "Set explicitly on this container."
                : `Inheriting — currently renders as "${effective}".`}
            </p>
            {own && (
              <button
                onClick={() => set.mutate(null)}
                disabled={set.isPending}
                className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Reset to inherit
              </button>
            )}
          </div>
        </>
      )}
      {msg && <Msg text={msg} />}
    </Section>
  );
}

/* ── CREATE CHILD ─────────────────────────────────────────────────── */

function CreateChildSection({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/children`, {
        display_name: name.trim(),
      }),
    onSuccess: (child: any) => {
      setMsg(
        `Created "${child.display_name ?? name}". You are seated as its owner.`,
      );
      setName("");
      qc.invalidateQueries({ queryKey: ["move-targets", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <Section
      title="Create child container"
      subtitle="A new workspace under this one. You'll be its first owner; platform features are on from the start."
    >
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Child container name"
          className={inputClass}
        />
        <button
          onClick={() => name.trim() && create.mutate()}
          disabled={create.isPending || !name.trim()}
          className={primaryBtn}
        >
          Create
        </button>
      </div>
      {msg && <Msg text={msg} />}
    </Section>
  );
}

/* ── MOVE (with preview) ──────────────────────────────────────────── */

function MoveSection({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [preview, setPreview] = useState<MovePreview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const targets = useQuery({
    queryKey: ["move-targets", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/move/targets`),
  });

  const doPreview = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/move/preview`, {
        new_parent_id: targetId,
      }),
    onSuccess: (p: MovePreview) => {
      setPreview(p);
      setMsg(null);
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const doMove = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/move`, {
        new_parent_id: targetId,
      }),
    onSuccess: () => {
      setPreview(null);
      setTargetId("");
      setMsg("Moved.");
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
      qc.invalidateQueries({ queryKey: ["move-targets", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const list: { id: string; display_name: string; depth: number }[] =
    Array.isArray(targets.data) ? targets.data : [];

  return (
    <Section
      title="Move container"
      subtitle="Repositions this container (and everything under it) elsewhere in your organization. Same tenant only."
    >
      {!preview ? (
        <>
          <div className="flex gap-2">
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose new parent…</option>
              {list.map((t) => (
                <option key={t.id} value={t.id}>
                  {"\u00A0".repeat(t.depth * 2)}
                  {t.display_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => targetId && doPreview.mutate()}
              disabled={doPreview.isPending || !targetId}
              className={primaryBtn}
            >
              Preview
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2 m-0">
            You'll see exactly who gains and loses access before anything moves.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 p-4">
          <p className="text-sm text-black dark:text-white m-0 mb-2">
            Moving <strong>{preview.container.display_name}</strong> (
            {preview.subtree_size} container
            {preview.subtree_size !== 1 ? "s" : ""} total) under{" "}
            <strong>{preview.new_parent.display_name}</strong>
          </p>

          <AccessDiff
            label="Will lose access"
            people={preview.losing_access}
            tone="loss"
          />
          <AccessDiff
            label="Will gain access"
            people={preview.gaining_access}
            tone="gain"
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => doMove.mutate()}
              disabled={doMove.isPending}
              className={primaryBtn}
            >
              Confirm move
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-2 text-xs text-neutral-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {msg && <Msg text={msg} />}
    </Section>
  );
}

function AccessDiff({
  label,
  people,
  tone,
}: {
  label: string;
  people: { actor_id: string; via_container: string }[];
  tone: "loss" | "gain";
}) {
  return (
    <div className="mb-2">
      <p
        className={`text-[11px] font-semibold m-0 mb-1 ${tone === "loss" ? "text-amber-600" : "text-emerald-600"}`}
      >
        {label} ({people.length})
      </p>
      {people.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No one.</p>
      ) : (
        <ul className="m-0 pl-4">
          {people.map((p) => (
            <li key={p.actor_id} className="text-[11px] text-neutral-500">
              {p.actor_id.slice(0, 8)}…{" "}
              <span className="text-neutral-400">via {p.via_container}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── ARCHIVE / RESTORE ────────────────────────────────────────────── */

function ArchiveSection({
  containerId,
  canArchive,
  canRestore,
}: {
  containerId: string;
  canArchive: boolean;
  canRestore: boolean;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const archive = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/archive`),
    onSuccess: () => {
      setMsg("Archived. Records are kept; this can be undone with Restore.");
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
    },
    onError: (e: Error) => {
      setMsg(e.message);
      setConfirming(false);
    },
  });

  const restore = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/restore`),
    onSuccess: () => {
      setMsg("Restored.");
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <Section
      title="Archive"
      subtitle="Archiving closes this workspace without deleting anything — every record stays, and it can be restored. There is no delete: history is kept on purpose."
    >
      <div className="flex gap-2">
        {canArchive &&
          (!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="px-3 py-2 text-xs font-semibold rounded-md border border-amber-400 text-amber-600"
            >
              Archive container…
            </button>
          ) : (
            <>
              <button
                onClick={() => archive.mutate()}
                disabled={archive.isPending}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-amber-600 text-white disabled:opacity-40"
              >
                Yes, archive
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-2 text-xs text-neutral-500"
              >
                Cancel
              </button>
            </>
          ))}
        {canRestore && (
          <button
            onClick={() => restore.mutate()}
            disabled={restore.isPending}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
          >
            Restore
          </button>
        )}
      </div>
      {msg && <Msg text={msg} />}
    </Section>
  );
}

/* ── shared ───────────────────────────────────────────────────────── */

const inputClass =
  "flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white";
const primaryBtn =
  "px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40";
