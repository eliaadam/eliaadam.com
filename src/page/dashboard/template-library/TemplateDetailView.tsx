import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GitFork } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { Template, TemplateDetail, VersionDetail } from "../../../lib/sdk/domains/templateLibrary";
import { AttachmentList } from "./AttachmentList";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { DraftEditor } from "./DraftEditor";
import {
  dangerButtonClass, errorMessage, errorTextClass, inputClass, labelClass, parseTags, primaryButtonClass,
  secondaryButtonClass, statusClasses,
} from "./ui";

export function TemplateDetailView({
  templateId, containerId, onBack, onOpen,
}: {
  templateId: string;
  containerId: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ["template-library", "template", templateId],
    queryFn: () => sdk.templateLibrary.getTemplate(templateId),
  });

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white">
        <ArrowLeft size={13} /> Back
      </button>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          This template doesn't exist, or it's private and you're not a collaborator.
        </p>
      )}
      {detail && <Loaded detail={detail} containerId={containerId} onOpen={onOpen} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Loaded({ detail, containerId, onOpen }: { detail: TemplateDetail; containerId: string; onOpen: (id: string) => void }) {
  const { template, my_role: role } = detail;
  const isCollaborator = role !== null;
  const isOwner = role === "owner";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{template.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(template.status)}`}>{template.status}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {template.visibility}
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {template.kind} · {detail.install_count} install{detail.install_count === 1 ? "" : "s"}
          {template.forked_from_template_id && (
            <>
              {" · forked from "}
              <button type="button" className="font-medium hover:underline" onClick={() => onOpen(template.forked_from_template_id as string)}>
                another template
              </button>
            </>
          )}
        </p>
        {template.description && <p className="text-sm text-neutral-700 dark:text-neutral-300">{template.description}</p>}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.tags.map((t) => (
              <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">{t}</span>
            ))}
          </div>
        )}
      </header>

      {detail.published && template.status !== "archived" && (
        <UseTemplate template={template} containerId={containerId} onForked={onOpen} />
      )}

      {detail.published ? (
        <Section title={`Published — v${detail.published.version.version_number}`}>
          <VersionViewer detail={detail.published} />
        </Section>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">This template hasn't been published yet.</p>
      )}

      {isCollaborator && (
        <>
          <Section title="Draft">
            <DraftEditor template={template} draft={detail.draft} />
          </Section>
          <Section title="Details & visibility">
            <SettingsForm template={template} isOwner={isOwner} />
          </Section>
          <Section title="Collaborators">
            <CollaboratorsPanel templateId={template.id} isOwner={isOwner} />
          </Section>
          <Section title="Version history">
            <VersionHistory templateId={template.id} />
          </Section>
        </>
      )}
    </div>
  );
}

function VersionViewer({ detail }: { detail: VersionDetail }) {
  const { version, attachments } = detail;
  return (
    <div className="flex flex-col gap-3">
      {version.changelog && <p className="text-xs text-neutral-600 dark:text-neutral-400">{version.changelog}</p>}
      {Object.keys(version.payload).length > 0 ? (
        <pre className="max-h-72 overflow-auto rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
          {JSON.stringify(version.payload, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">No structured content.</p>
      )}
      <div className="flex flex-col gap-1.5">
        <p className={labelClass}>Files</p>
        <AttachmentList attachments={attachments} />
      </div>
    </div>
  );
}

function UseTemplate({ template, containerId, onForked }: { template: Template; containerId: string; onForked: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [optionsText, setOptionsText] = useState("");
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const { data: kinds } = useQuery({
    queryKey: ["template-library", "kinds"],
    queryFn: () => sdk.templateLibrary.listKinds(),
  });
  const kind = kinds?.find((k) => k.code === template.kind);

  const install = useMutation({
    mutationFn: (options: Record<string, unknown>) =>
      sdk.templateLibrary.installTemplate(containerId, template.id, { options }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["template-library"] }),
  });
  const fork = useMutation({
    mutationFn: () => sdk.templateLibrary.forkTemplate(containerId, template.id),
    onSuccess: (forked) => {
      queryClient.invalidateQueries({ queryKey: ["template-library", "mine"] });
      onForked(forked.id);
    },
  });

  const runInstall = () => {
    setOptionsError(null);
    let options: Record<string, unknown> = {};
    if (optionsText.trim()) {
      try {
        const value: unknown = JSON.parse(optionsText);
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
        options = value as Record<string, unknown>;
      } catch {
        setOptionsError("Options must be a JSON object.");
        return;
      }
    }
    install.mutate(options);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Use this template</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            {kind && !kind.applicable
              ? "Installing records that this container adopted it; you can download its files below."
              : "Applying copies its content into this container — later edits to the template won't change what you applied."}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={() => fork.mutate()} disabled={fork.isPending} className={`flex items-center gap-1 ${secondaryButtonClass}`}>
            <GitFork size={12} />
            {fork.isPending ? "Forking…" : "Fork"}
          </button>
          <button type="button" onClick={runInstall} disabled={install.isPending} className={primaryButtonClass}>
            {install.isPending ? "Applying…" : "Apply to this container"}
          </button>
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-neutral-500 dark:text-neutral-500">Options (advanced)</summary>
        <textarea
          className={`${inputClass} mt-2 font-mono text-xs`}
          rows={3}
          spellCheck={false}
          placeholder='{"example": "passed to the template as-is"}'
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
      </details>

      {optionsError && <p className={errorTextClass}>{optionsError}</p>}
      {install.isError && <p className={errorTextClass}>{errorMessage(install.error, "Couldn't apply this template.")}</p>}
      {install.isSuccess && <p className="text-xs text-neutral-600 dark:text-neutral-400">Applied (v{install.data.version_number}). See “Installed here”.</p>}
      {fork.isError && <p className={errorTextClass}>{errorMessage(fork.error, "Couldn't fork this template.")}</p>}
    </div>
  );
}

function SettingsForm({ template, isOwner }: { template: Template; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["template-library"] });
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [tags, setTags] = useState(template.tags.join(", "));

  const save = useMutation({
    mutationFn: () => sdk.templateLibrary.updateTemplate(template.id, { name, description, tags: parseTags(tags) }),
    onSuccess: refresh,
  });
  const visibility = useMutation({
    mutationFn: () => sdk.templateLibrary.setVisibility(template.id, template.visibility === "public" ? "private" : "public"),
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: () => (template.status === "archived" ? sdk.templateLibrary.restoreTemplate(template.id) : sdk.templateLibrary.archiveTemplate(template.id)),
    onSuccess: refresh,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tags</label>
          <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Saving…" : "Save details"}
        </button>
        {save.isError && <p className={errorTextClass}>{errorMessage(save.error)}</p>}
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button type="button" onClick={() => visibility.mutate()} disabled={visibility.isPending} className={secondaryButtonClass}>
            {template.visibility === "public" ? "Make private" : "Make public"}
          </button>
          <button type="button" onClick={() => archive.mutate()} disabled={archive.isPending} className={template.status === "archived" ? secondaryButtonClass : dangerButtonClass}>
            {template.status === "archived" ? "Restore" : "Archive"}
          </button>
          {template.visibility === "private" && template.latest_version_number === 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-500">Publish a version before making it public.</span>
          )}
          {visibility.isError && <p className={errorTextClass}>{errorMessage(visibility.error)}</p>}
          {archive.isError && <p className={errorTextClass}>{errorMessage(archive.error)}</p>}
        </div>
      )}
    </div>
  );
}

function VersionHistory({ templateId }: { templateId: string }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const { data: versions } = useQuery({
    queryKey: ["template-library", "versions", templateId],
    queryFn: () => sdk.templateLibrary.listVersions(templateId),
  });
  const { data: viewed } = useQuery({
    queryKey: ["template-library", "version", templateId, viewing],
    queryFn: () => sdk.templateLibrary.getVersion(templateId, viewing as number),
    enabled: viewing !== null,
  });

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {versions?.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 text-xs">
            <button type="button" onClick={() => setViewing(viewing === v.version_number ? null : v.version_number)} className="font-medium hover:underline">
              v{v.version_number} · {v.status}
            </button>
            <span className="truncate text-neutral-500 dark:text-neutral-500">
              {v.changelog || "No notes"} {v.published_at ? `· ${new Date(v.published_at).toLocaleDateString()}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {viewed && viewing !== null && <VersionViewer detail={viewed} />}
    </div>
  );
}
