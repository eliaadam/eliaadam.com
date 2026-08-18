import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  templatesApi as api,
  templatesApiBase,
  toMajor,
} from "./templates-api";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  format: string | null;
  file_size: number;
  price: number;
  currency: string;
  status: string;
  original_filename: string | null;
};

const CATEGORIES = [
  "invoice",
  "form",
  "spreadsheet",
  "letter",
  "config",
  "other",
];

/**
 * Templates workspace — upload reusable files. Each saved template with a file
 * registers as an asset, so it's automatically publishable on the marketplace
 * (via the Marketplace panel's asset publishing). No marketplace code here.
 */
export default function TemplatesWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = can("maicore.templates.template.create");

  const templates = useQuery({
    queryKey: ["templates", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/templates`),
  });

  const list: Template[] = Array.isArray(templates.data) ? templates.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canManage && (
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          {creating ? "Close" : "+ New template"}
        </button>
      )}

      {creating && canManage && (
        <CreateForm
          containerId={containerId}
          onDone={() => {
            setMsg("Template created — upload a file to make it available.");
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["templates", containerId] });
          }}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.isLoading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No templates yet. Upload forms, invoices, or spreadsheets to reuse
            and share.
          </div>
        ) : (
          list.map((t) => (
            <TemplateCard
              key={t.id}
              containerId={containerId}
              template={t}
              canManage={canManage}
              onChange={() =>
                qc.invalidateQueries({ queryKey: ["templates", containerId] })
              }
              onMsg={setMsg}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  containerId,
  template: t,
  canManage,
  onChange,
  onMsg,
}: {
  containerId: string;
  template: Template;
  canManage: boolean;
  onChange: () => void;
  onMsg: (m: string) => void;
}) {
  const hasFile = !!t.format;
  const API = templatesApiBase();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("use_token");
      const res = await fetch(
        `${API}/containers/${containerId}/templates/${t.id}/file`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: fd,
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
      onMsg(
        "File uploaded — template is now available and registered as a marketplace asset.",
      );
      onChange();
    } catch (err: any) {
      onMsg(err.message ?? "Upload failed.");
    }
  }

  function download() {
    const token = localStorage.getItem("use_token");
    // Simple download via fetch → blob (keeps the Authorization header).
    fetch(`${API}/containers/${containerId}/templates/${t.id}/download`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = t.original_filename ?? t.name;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-black dark:text-white">
          {t.name}
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
          {t.status}
        </span>
      </div>
      {t.description && (
        <div className="text-[11px] text-neutral-400 mt-1 flex-1">
          {t.description}
        </div>
      )}
      <div className="text-[11px] text-neutral-400 mt-2 flex items-center gap-2 flex-wrap">
        {t.category && (
          <span className="px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
            {t.category}
          </span>
        )}
        {t.format && <span className="uppercase">{t.format}</span>}
        {t.file_size > 0 && <span>{(t.file_size / 1024).toFixed(0)} KB</span>}
        {t.price > 0 && (
          <span className="text-green-600">
            {toMajor(t.price)} {t.currency}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {hasFile && (
          <button
            onClick={download}
            className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
          >
            Download
          </button>
        )}
        {canManage && (
          <label className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer text-neutral-600 dark:text-neutral-400">
            {hasFile ? "Replace file" : "Upload file"}
            <input type="file" onChange={onFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}

function CreateForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("form");
  const [price, setPrice] = useState("0");

  const save = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/templates`, {
        name: name.trim(),
        description: description.trim() || null,
        category,
        price: Math.round(parseFloat(price || "0") * 100),
      }),
    onSuccess: onDone,
  });

  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className={`${input} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={`${input} w-full`}
        rows={2}
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={input}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (0 = free)"
          type="number"
          min="0"
          step="0.01"
          className={`${input} w-32`}
        />
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={!name.trim() || save.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        Create template
      </button>
      {save.isError && (
        <span className="ml-2 text-xs text-red-600">
          {(save.error as any)?.message}
        </span>
      )}
    </div>
  );
}
