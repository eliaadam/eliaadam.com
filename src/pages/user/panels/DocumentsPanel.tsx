import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * The first business capability with a real UI.
 *
 * ── THE ONE RULE ────────────────────────────────────────────────────
 *
 * The server decides what this actor can do. It handed us `permissions` — a
 * flat list of codes — and this component renders exactly that and nothing
 * more.
 *
 * We never infer permissions from a role, never hardcode "managers can
 * delete", never guess. If the button is not backed by a permission in the
 * list, it does not exist. And the API re-checks anyway, so a hidden button is
 * a courtesy, not a security control.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

function authHeaders(containerId?: string): Record<string, string> {
  const token = localStorage.getItem("maicore_token");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(containerId ? { "X-Maicore-Container": containerId } : {}),
  };
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  containerId?: string,
) {
  const isForm = body instanceof FormData;

  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: isForm
      ? authHeaders(containerId)
      : {
          ...authHeaders(containerId),
          "Content-Type": "application/json",
        },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const e: any = new Error(b.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }

  if (res.status === 204) {
    return null;
  }

  const j = await res.json();

  return j.data ?? j;
}

type Doc = {
  id: string;
  title: string;
  status: string;
  owner_actor_id: string;
  owner_status: "assigned" | "unassigned" | "shared";
  document_type_id: string;
  created_at: string;
};

type DocType = { id: string; name: string; description: string | null };

export default function DocumentsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [typeId, setTypeId] = useState("");

  const can = (code: string) => permissions.includes(code);

  const docsQ = useQuery({
    queryKey: ["documents", containerId],
    queryFn: () =>
      api(
        "GET",
        `/documents?container_id=${encodeURIComponent(containerId)}`,
        undefined,
        containerId,
      ) as Promise<Doc[]>,
  });

  const typesQ = useQuery({
    queryKey: ["documents", "types"],
    queryFn: () => api("GET", "/documents/types") as Promise<DocType[]>,
    enabled: can("documents.document.create"),
  });

  const docs = docsQ.data ?? [];
  const types = typesQ.data ?? [];

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Choose a file first.");
      if (!typeId) throw new Error("Choose a document type.");

      const form = new FormData();
      form.append("file", file);
      form.append("container_id", containerId);
      form.append("document_type_id", typeId);
      form.append("title", title || file.name);

      return api("POST", "/documents", form, containerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", containerId] });
      setTitle("");
      setUploading(false);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => setError(e.message),
  });

  const retire = useMutation({
    mutationFn: (id: string) =>
      api("POST", `/documents/${id}/retire`, undefined, containerId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["documents", containerId] }),
    onError: (e: Error) => setError(e.message),
  });

  const download = async (doc: Doc) => {
    const res = await fetch(`${API}/api/documents/${doc.id}/download`, {
      headers: authHeaders(containerId),
    });

    if (!res.ok) {
      setError("Download failed.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = doc.title;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn =
    "px-3 py-1.5 text-xs font-semibold rounded-md transition disabled:opacity-40";
  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 " +
    "bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <p className="text-xs text-red-700 dark:text-red-400 m-0">{error}</p>
        </div>
      )}

      {/* ── Upload — only if the server said we may create ─────────── */}
      {can("documents.document.create") && (
        <div className="mb-6">
          {!uploading ? (
            <button
              onClick={() => setUploading(true)}
              className={`${btn} bg-black text-white dark:bg-white dark:text-black`}
            >
              + Upload document
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-wrap gap-2 mb-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (defaults to filename)"
                  className={`${input} flex-1 min-w-[200px]`}
                />
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className={`${input} w-48`}
                >
                  <option value="">Type…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <input
                ref={fileRef}
                type="file"
                className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 block"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => upload.mutate()}
                  disabled={upload.isPending}
                  className={`${btn} bg-black text-white dark:bg-white dark:text-black`}
                >
                  {upload.isPending ? "Uploading…" : "Upload"}
                </button>
                <button
                  onClick={() => {
                    setUploading(false);
                    setError(null);
                  }}
                  className={`${btn} border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────── */}
      {docsQ.isLoading ? (
        <p className="text-sm text-neutral-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 m-0">
            No documents in this container yet.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-black dark:text-white m-0 truncate">
                    {doc.title}
                  </p>

                  {doc.status !== "active" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                      {doc.status}
                    </span>
                  )}

                  {/* The owner left the container. The document survives, and
                      it is waiting for someone to take it on. This is the
                      ownership invariant made visible — not a hidden flag in a
                      table nobody reads. */}
                  {doc.owner_status === "unassigned" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-500"
                      title="The owner left this container. Reassign it in the orphan queue."
                    >
                      needs an owner
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {can("documents.version.download") && (
                  <button
                    onClick={() => download(doc)}
                    className={`${btn} text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white`}
                  >
                    Download
                  </button>
                )}

                {can("documents.document.retire") &&
                  doc.status === "active" && (
                    <button
                      onClick={() => retire.mutate(doc.id)}
                      disabled={retire.isPending}
                      className={`${btn} text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white`}
                    >
                      Retire
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read-only is a legitimate state, not a broken one. Say so, rather
          than showing an empty toolbar and letting people wonder. */}
      {!can("documents.document.create") && (
        <p className="text-[11px] text-neutral-400 mt-3 mb-0">
          You have read access to documents in this container.
        </p>
      )}
    </div>
  );
}
