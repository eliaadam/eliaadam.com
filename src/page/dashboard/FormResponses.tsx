import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sdk } from "../../lib/sdk";

/**
 * NOTE on document answers: this shows the raw file id and does NOT
 * offer a real download link — Document's HTTP surface for downloading
 * a file by id wasn't verified in this session (no `document.ts` SDK
 * module exists yet in this codebase). Add a proper link once that
 * endpoint is confirmed, rather than guessing at a URL shape here.
 */
export function FormResponses() {
  const { formId } = useParams<{ formId: string }>();

  const { data: form } = useQuery({
    queryKey: ["form", "detail", formId],
    queryFn: () => sdk.form.getForm(formId!),
    enabled: Boolean(formId),
  });

  const { data: responses, isLoading } = useQuery({
    queryKey: ["form", "responses", formId],
    queryFn: () => sdk.form.listResponses(formId!),
    enabled: Boolean(formId),
  });

  const fieldFor = (fieldId: string) =>
    form?.fields.find((f) => f.id === fieldId);

  return (
    <div className="max-w-2xl">
      <Link
        to={`/dashboard/form/${formId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to form
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        Responses{form ? ` — ${form.title}` : ""}
      </h1>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}
      {responses && responses.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          No responses yet.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {responses?.map((response) => (
          <div
            key={response.id}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {response.respondent_actor_id ?? "Anonymous"}
              {response.submitted_at &&
                ` · ${new Date(response.submitted_at).toLocaleString()}`}
            </p>
            <dl className="mt-2 flex flex-col gap-2">
              {response.answers.map((answer) => {
                const field = fieldFor(answer.field_id);
                return (
                  <div key={answer.field_id}>
                    <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                      {field?.label ?? answer.field_id}
                    </dt>
                    <dd className="text-sm">
                      {field?.type === "document" ? (
                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
                          file id: {String(answer.value)}
                        </span>
                      ) : Array.isArray(answer.value) ? (
                        answer.value.join(", ")
                      ) : (
                        String(answer.value)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
