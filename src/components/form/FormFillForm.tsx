import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  sdk,
  FormValidationError,
  type AnswerInput,
  type FormRecord,
} from "../../lib/sdk";
import { FieldRenderer } from "./FieldRenderer";

/**
 * Shared between the in-app fill page (`FormFill.tsx`, an
 * authenticated actor's own id attached) and the genuinely public one
 * (`PublicFormFill.tsx`, no `respondentActorId` at all — anonymous).
 * Picks `submitResponseWithFiles` vs `submitResponse` automatically
 * based on whether this form has any `document` field, since only the
 * former can carry actual file bytes.
 */
export function FormFillForm({
  form,
  respondentActorId,
}: {
  form: FormRecord;
  respondentActorId?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasDocumentField = form.fields.some((f) => f.type === "document");

  const mutation = useMutation({
    mutationFn: async () => {
      const documentFiles: Record<string, File> = {};
      const answerInputs: AnswerInput[] = [];

      for (const field of form.fields) {
        const value = answers[field.id];
        if (value === undefined) continue;
        if (field.type === "document") {
          if (value instanceof File) documentFiles[field.id] = value;
          continue; // resolved server-side from the uploaded file, never sent as a plain answer
        }
        answerInputs.push({ field_id: field.id, value });
      }

      if (hasDocumentField) {
        return sdk.form.submitResponseWithFiles(form.id, {
          answers: answerInputs,
          respondent_actor_id: respondentActorId,
          documentFiles,
        });
      }
      return sdk.form.submitResponse(form.id, {
        answers: answerInputs,
        respondent_actor_id: respondentActorId,
      });
    },
    onError: (err) => {
      setFieldErrors(err instanceof FormValidationError ? err.errors : {});
    },
    onSuccess: () => setFieldErrors({}),
  });

  if (mutation.isSuccess) {
    return (
      <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
        <p className="text-sm font-medium">Response submitted</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Thanks for filling this out.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-6"
    >
      {form.fields
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, [field.id]: value }))
            }
            error={fieldErrors[field.id]}
          />
        ))}

      {fieldErrors._form && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {fieldErrors._form}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
