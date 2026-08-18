import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

/*
 * DocumentUpload — a small reusable control that uploads one file to the
 * Documents domain and hands back the resulting document_id.
 *
 * It talks to the real Documents HTTP API:
 *   GET  /api/documents/types            → the type vocabulary
 *   POST /api/documents (multipart)      → creates the doc, returns {id}
 *
 * The caller supplies the container_id and a title, gets back the document_id
 * via onUploaded, and stores it (e.g. in a KYC record's document_ids). The type
 * is chosen from the live vocabulary, so this works whatever types your
 * platform has seeded — no hard-coded type names that might not exist.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

type DocType = { id: string; name: string; description?: string };

async function fetchTypes(): Promise<DocType[]> {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(`${API}/api/documents/types`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const j = await res.json().catch(() => ({}));
  return j.data ?? [];
}

export type UploadedDoc = { id: string; title: string; typeName: string };

export function DocumentUpload({
  containerId,
  label,
  defaultTitle,
  suggestType,
  onUploaded,
}: {
  containerId: string;
  label: string;
  defaultTitle?: string;
  /** case-insensitive substring to preselect a matching type (e.g. "national id") */
  suggestType?: string;
  onUploaded: (doc: UploadedDoc) => void;
}) {
  const typesQ = useQuery({ queryKey: ["doc-types"], queryFn: fetchTypes });
  const types = typesQ.data ?? [];

  const [typeId, setTypeId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<UploadedDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Preselect a type if a suggestion matches the vocabulary.
  const effectiveType =
    typeId ||
    (suggestType
      ? (types.find((t) =>
          t.name.toLowerCase().includes(suggestType.toLowerCase()),
        )?.id ?? "")
      : "");

  async function upload() {
    if (!file || !effectiveType) {
      setErr("Pick a document type and a file.");
      return;
    }
    setBusy(true);
    setErr(null);

    const form = new FormData();
    form.append("container_id", containerId);
    form.append("document_type_id", effectiveType);
    form.append("title", title.trim() || file.name);
    form.append("file", file);

    try {
      const token = localStorage.getItem("sindano_token");
      const res = await fetch(`${API}/api/documents`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form, // no Content-Type — the browser sets the multipart boundary
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.message ?? `Upload failed (${res.status}).`);
        setBusy(false);
        return;
      }
      const doc = j.data;
      const typeName =
        types.find((t) => t.id === effectiveType)?.name ?? "Document";
      const uploaded = { id: doc.id, title: doc.title, typeName };
      setDone(uploaded);
      onUploaded(uploaded);
    } catch {
      setErr("Network error during upload.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-emerald-600">
        <span>
          ✓ {label}: {done.title}
        </span>
        <button
          onClick={() => {
            setDone(null);
            setFile(null);
            setTitle(defaultTitle ?? "");
          }}
          className="text-neutral-400 hover:text-neutral-600 underline"
        >
          replace
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-2.5">
      <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 m-0 mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={effectiveType}
          onChange={(e) => setTypeId(e.target.value)}
          className="px-2 py-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white max-w-[160px]"
        >
          <option value="">Type…</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-[11px] text-neutral-500 max-w-[180px] file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:text-[11px] file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-600 dark:file:text-neutral-300"
        />
        <button
          onClick={upload}
          disabled={busy || !file || !effectiveType}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      {err && <p className="text-[10px] text-red-600 mt-1 m-0">{err}</p>}
      {typesQ.isLoading && (
        <p className="text-[10px] text-neutral-400 mt-1 m-0">Loading types…</p>
      )}
    </div>
  );
}
