import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import {
  errorMessage, errorTextClass, inputClass, labelClass, parseTags, primaryButtonClass, statusClasses,
} from "./ui";

export function MyTemplatesTab({ containerId, onOpen }: { containerId: string; onOpen: (id: string) => void }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["template-library", "mine"],
    queryFn: () => sdk.templateLibrary.listMyTemplates(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Templates you collaborate on</p>
        <button type="button" onClick={() => setShowCreate((v) => !v)} className={`flex items-center gap-1 ${primaryButtonClass}`}>
          <Plus size={13} />
          {showCreate ? "Close" : "New template"}
        </button>
      </div>

      {showCreate && <CreateTemplateForm containerId={containerId} onCreated={onOpen} />}
      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {templates && templates.length === 0 && !showCreate && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
          You aren't collaborating on any templates yet.
        </p>
      )}

      {templates && templates.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {templates.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(t.status)}`}>{t.status}</span>
                  <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">{t.visibility}</span>
                </span>
                <span className="flex-none text-xs text-neutral-500 dark:text-neutral-500">
                  {t.kind} · {t.latest_version_number > 0 ? `v${t.latest_version_number}` : "unpublished"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateTemplateForm({ containerId, onCreated }: { containerId: string; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const { data: kinds } = useQuery({
    queryKey: ["template-library", "kinds"],
    queryFn: () => sdk.templateLibrary.listKinds(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.templateLibrary.createTemplate(containerId, {
        name,
        kind,
        description: description || undefined,
        tags: parseTags(tags),
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["template-library", "mine"] });
      onCreated(template.id);
    },
  });

  const selectedKind = kinds?.find((k) => k.code === kind);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Kind</label>
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Select a kind…</option>
            {kinds?.map((k) => (
              <option key={k.code} value={k.code}>{k.label}</option>
            ))}
          </select>
          {selectedKind && <p className="text-[11px] text-neutral-500 dark:text-neutral-500">{selectedKind.description}</p>}
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className={labelClass}>Tags (comma separated)</label>
          <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="retail, cafe" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || !kind || mutation.isPending} className={primaryButtonClass}>
          {mutation.isPending ? "Creating…" : "Create template"}
        </button>
        {mutation.isError && <p className={errorTextClass}>{errorMessage(mutation.error, "Couldn't create this template.")}</p>}
      </div>
    </div>
  );
}
