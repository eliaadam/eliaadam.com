import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Template, VersionDetail } from "../../../lib/sdk/domains/templateLibrary";
import { AttachmentList } from "./AttachmentList";
import {
  dangerButtonClass, errorMessage, errorTextClass, inputClass, labelClass, primaryButtonClass,
} from "./ui";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function DraftEditor({ template, draft }: { template: Template; draft: VersionDetail | null }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["template-library"] });

  const start = useMutation({ mutationFn: () => sdk.templateLibrary.createDraft(template.id), onSuccess: refresh });

  if (template.status === "archived") {
    return <p className="text-xs text-neutral-500 dark:text-neutral-500">Restore this template to edit it.</p>;
  }

  if (!draft) {
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => start.mutate()} disabled={start.isPending} className={primaryButtonClass}>
          {start.isPending ? "Starting…" : `Start draft v${template.latest_version_number + 1}`}
        </button>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">Begins from the latest published version.</p>
        {start.isError && <p className={errorTextClass}>{errorMessage(start.error)}</p>}
      </div>
    );
  }

  // Re-mount whenever the server copy changes so the form always starts
  // from what was actually saved.
  return <DraftForm key={`${draft.version.id}:${draft.version.updated_at}`} template={template} draft={draft} onChanged={refresh} />;
}

function DraftForm({ template, draft, onChanged }: { template: Template; draft: VersionDetail; onChanged: () => void }) {
  const original = JSON.stringify(draft.version.payload, null, 2);
  const [payloadText, setPayloadText] = useState(original);
  const [changelog, setChangelog] = useState(draft.version.changelog);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: kinds } = useQuery({
    queryKey: ["template-library", "kinds"],
    queryFn: () => sdk.templateLibrary.listKinds(),
  });
  const hint = kinds?.find((k) => k.code === template.kind)?.payload_hint;

  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  try {
    const value: unknown = JSON.parse(payloadText || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) parsed = value as Record<string, unknown>;
    else parseError = "The payload must be a JSON object.";
  } catch {
    parseError = "That isn't valid JSON yet.";
  }

  const dirty = payloadText !== original || changelog !== draft.version.changelog;

  const save = useMutation({
    mutationFn: () => sdk.templateLibrary.updateDraft(template.id, { payload: parsed ?? undefined, changelog }),
    onSuccess: onChanged,
  });
  const publish = useMutation({ mutationFn: () => sdk.templateLibrary.publishDraft(template.id), onSuccess: onChanged });
  const discard = useMutation({ mutationFn: () => sdk.templateLibrary.discardDraft(template.id), onSuccess: onChanged });
  const upload = useMutation({
    mutationFn: (file: File) => sdk.templateLibrary.uploadAttachment(template.id, file),
    onSuccess: onChanged,
    onError: (e) => setUploadError(errorMessage(e, "Couldn't upload that file.")),
  });
  const removeFile = useMutation({
    mutationFn: (attachmentId: string) => sdk.templateLibrary.removeAttachment(template.id, attachmentId),
    onSuccess: onChanged,
  });

  const onPickFile = (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Files are limited to 25 MB.");
      return;
    }
    upload.mutate(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Editing draft <span className="font-medium text-black dark:text-white">v{draft.version.version_number}</span>. Nothing
        here is visible to anyone else until you publish.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Payload (JSON)</label>
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={10}
          spellCheck={false}
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          placeholder={hint ? JSON.stringify(hint.example ?? hint, null, 2) : "{}"}
        />
        {parseError && <p className={errorTextClass}>{parseError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>What changed in this version?</label>
        <input className={inputClass} value={changelog} onChange={(e) => setChangelog(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => save.mutate()} disabled={!dirty || parsed === null || save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Saving…" : "Save draft"}
        </button>
        {save.isError && <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save.")}</p>}
        {save.isSuccess && !dirty && <p className="text-xs text-neutral-500 dark:text-neutral-500">Saved.</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <p className={labelClass}>Files on this draft</p>
        <AttachmentList
          attachments={draft.attachments}
          onRemove={(id) => removeFile.mutate(id)}
          removing={removeFile.isPending}
        />
        <div className="flex items-center gap-3">
          <input ref={fileInput} type="file" className="text-xs" onChange={(e) => onPickFile(e.target.files?.[0])} disabled={upload.isPending} />
          {upload.isPending && <span className="text-xs text-neutral-500 dark:text-neutral-500">Uploading…</span>}
        </div>
        {uploadError && <p className={errorTextClass}>{uploadError}</p>}
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => publish.mutate()}
          disabled={dirty || publish.isPending}
          className={primaryButtonClass}
          title={dirty ? "Save your changes first — publishing uses the saved draft" : undefined}
        >
          {publish.isPending ? "Publishing…" : `Publish v${draft.version.version_number}`}
        </button>
        {template.latest_version_number > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Discard this draft? Its changes and files are lost.")) discard.mutate();
            }}
            disabled={discard.isPending}
            className={dangerButtonClass}
          >
            Discard draft
          </button>
        )}
        {dirty && <span className="text-xs text-neutral-500 dark:text-neutral-500">Unsaved changes</span>}
      </div>
      {publish.isError && <p className={errorTextClass}>{errorMessage(publish.error, "Couldn't publish.")}</p>}
      {discard.isError && <p className={errorTextClass}>{errorMessage(discard.error)}</p>}
    </div>
  );
}
