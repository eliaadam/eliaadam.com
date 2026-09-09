import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { sdk } from "../lib/sdk";
import { FormFillForm } from "../components/form/FormFillForm";

/**
 * Genuinely public — reachable without signing in, matching "anonymous
 * responses are allowed" at the platform level. Routed OUTSIDE
 * ProtectedRoute in App.tsx (`/f/:formId`, not nested under
 * `/dashboard`). Always submits with no `respondentActorId` — a
 * signed-in user filling out a form from inside the app should use
 * `/dashboard/form/:formId/fill` instead, which attaches their actor
 * id.
 */
export function PublicFormFill() {
  const { formId } = useParams<{ formId: string }>();

  const {
    data: form,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-form", formId],
    queryFn: () => sdk.form.getForm(formId!),
    enabled: Boolean(formId),
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-lg px-6 py-16">
        {isLoading && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Loading…
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            This form doesn't exist.
          </p>
        )}
        {form && form.status !== "published" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This form isn't accepting responses right now.
          </p>
        )}
        {form && form.status === "published" && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {form.description}
              </p>
            )}
            <div className="mt-8">
              <FormFillForm form={form} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
