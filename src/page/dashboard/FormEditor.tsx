import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Plus, Share2, Users } from "lucide-react";
import { sdk, type FieldInput, type FieldType } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { FieldEditor } from "../../components/form/FieldEditor";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900";

function newField(type: FieldType = "short_text"): FieldInput {
  return { type, label: "", required: false, config: {} };
}

export function FormEditor() {
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: form, isLoading } = useQuery({
    queryKey: ["form", "detail", formId],
    queryFn: () => sdk.form.getForm(formId!),
    enabled: Boolean(formId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldInput[]>([]);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (form) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(form.title);
      setDescription(form.description ?? "");
      setFields(
        form.fields.map((f) => ({
          ...f,
          help_text: f.help_text ?? undefined,
        })),
      );
      setAllowMultiple(form.allow_multiple_responses_per_actor);
      setRequireAuth(form.require_authentication);
    }
  }, [form]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["form", "detail", formId] });

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.form.updateForm(formId!, {
        title,
        description: description || undefined,
        fields,
        allow_multiple_responses_per_actor: allowMultiple,
        require_authentication: requireAuth,
      }),
    onSuccess: invalidate,
  });

  const publishMutation = useMutation({
    mutationFn: () => sdk.form.publishForm(formId!, user!.id),
    onSuccess: invalidate,
  });
  const closeMutation = useMutation({
    mutationFn: () => sdk.form.closeForm(formId!, user!.id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.form.archiveForm(formId!),
    onSuccess: invalidate,
  });

  if (isLoading || !form) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  const shareUrl = `${window.location.origin}/f/${form.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {form.title || "Untitled form"}
        </h1>
        <span className="flex-none rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {form.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {form.status === "draft" && (
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            Publish
          </button>
        )}
        {form.status === "published" && (
          <>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              <Share2 size={14} />
              {copied ? "Copied!" : "Copy share link"}
            </button>
            <button
              type="button"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Close
            </button>
          </>
        )}
        {form.status !== "archived" && (
          <button
            type="button"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          >
            Archive
          </button>
        )}
        <Link
          to={`/dashboard/form/${form.id}/responses`}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
        >
          <Users size={14} />
          Responses
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <input
          className={`${inputClass} text-lg font-medium`}
          placeholder="Form title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={inputClass}
          placeholder="Description (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {fields.map((field, i) => (
          <FieldEditor
            key={field.id ?? i}
            field={field}
            onChange={(next) =>
              setFields((prev) => prev.map((f, fi) => (fi === i ? next : f)))
            }
            onRemove={() =>
              setFields((prev) => prev.filter((_, fi) => fi !== i))
            }
          />
        ))}
        <button
          type="button"
          onClick={() => setFields((prev) => [...prev, newField()])}
          className="flex items-center gap-1.5 self-start rounded-md border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-black hover:text-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white"
        >
          <Plus size={14} />
          Add question
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
          />
          Allow multiple responses per person
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={requireAuth}
            onChange={(e) => setRequireAuth(e.target.checked)}
          />
          Require sign-in to respond (blocks anonymous responses for this form)
        </label>
      </div>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="mt-6 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {saveMutation.isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
