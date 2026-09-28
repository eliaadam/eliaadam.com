import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { TemplateAttachment } from "../../../lib/sdk/domains/templateLibrary";
import { errorMessage, errorTextClass, formatBytes } from "./ui";

export function AttachmentList({
  attachments,
  onRemove,
  removing,
}: {
  attachments: TemplateAttachment[];
  onRemove?: (attachmentId: string) => void;
  removing?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (a: TemplateAttachment) => {
    setBusyId(a.id);
    setError(null);
    try {
      await sdk.templateLibrary.downloadAttachment(a);
    } catch (e) {
      setError(errorMessage(e, "Couldn't download that file."));
    } finally {
      setBusyId(null);
    }
  };

  if (attachments.length === 0) {
    return <p className="text-xs text-neutral-400 dark:text-neutral-600">No files.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <FileText size={13} className="flex-none text-neutral-400" />
              <span className="truncate">{a.filename}</span>
              <span className="flex-none text-neutral-400 dark:text-neutral-600">{formatBytes(a.size_bytes)}</span>
            </span>
            <span className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => download(a)}
                disabled={busyId === a.id}
                className="flex items-center gap-1 font-medium hover:underline disabled:opacity-60"
              >
                <Download size={12} />
                {busyId === a.id ? "Downloading…" : "Download"}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  disabled={removing}
                  className="text-red-600 hover:text-red-700 disabled:opacity-60 dark:text-red-400"
                  aria-label={`Remove ${a.filename}`}
                >
                  <X size={13} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
}
