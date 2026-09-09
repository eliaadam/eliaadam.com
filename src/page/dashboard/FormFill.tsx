import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { sdk } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { FormFillForm } from "../../components/form/FormFillForm";

/** For a signed-in actor filling out a form from within the app —
 * attaches their actor id. A genuinely anonymous fill uses
 * `PublicFormFill.tsx` (`/f/:formId`, outside the dashboard/auth
 * boundary) instead. */
export function FormFill() {
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();

  const { data: form, isLoading } = useQuery({
    queryKey: ["form", "detail", formId],
    queryFn: () => sdk.form.getForm(formId!),
    enabled: Boolean(formId),
  });

  if (isLoading || !form) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  if (form.status !== "published") {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        This form isn't accepting responses right now.
      </p>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">{form.title}</h1>
      {form.description && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {form.description}
        </p>
      )}
      <div className="mt-6">
        <FormFillForm form={form} respondentActorId={user?.id} />
      </div>
    </div>
  );
}
