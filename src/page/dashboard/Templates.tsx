import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Boxes, Layers } from "lucide-react";
import {
  sdk,
  type ContainerTemplate,
  type Visibility,
  type FormField,
} from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

// FIX: every primary button here used `bg-black ... text-white ...
// dark:bg-white` with no `dark:text-black` — dark mode correctly
// flips the background to white but leaves the text white too,
// rendering it unreadable. One shared constant with the fix, so it
// can't drift back out of sync.
const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

/**
 * The self-service instantiation surface — deliberately NOT under
 * /dashboard/admin and NOT gated by `usePermission`. Per the original
 * requirement, template MANAGEMENT is admin-only
 * (page/dashboard/admin/Templates.tsx), but INSTANTIATION is open to
 * every authenticated actor — the backend's `instantiate_template`
 * view has no permission check at all. Burying the only instantiate
 * button inside the admin-gated management page (an earlier mistake
 * in this app) meant normal users could never reach it even though
 * the backend would happily let them; this page is the fix.
 */
export function Templates() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", "gallery"],
    queryFn: () => sdk.provisioning.listTemplates(),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Instantiate a container (and any sub-hierarchy it defines) from a
        ready-made blueprint. You'll own everything it creates.
      </p>

      <div className="mt-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}

        {templates && templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <Boxes
              className="mx-auto text-neutral-400 dark:text-neutral-600"
              size={22}
            />
            <p className="mt-3 text-sm font-medium">No templates yet</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              An admin needs to create one first.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates?.map((template) => (
            <TemplateCard
              key={template.code}
              template={template}
              actorId={user!.id}
              currentContainerId={currentContainerId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  actorId,
  currentContainerId,
}: {
  template: ContainerTemplate;
  actorId: string;
  currentContainerId: string | null;
}) {
  const [name, setName] = useState("");
  const [asSubContainer, setAsSubContainer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visibilityOverride, setVisibilityOverride] = useState<Visibility | "">(
    "",
  );
  const [formAnswers, setFormAnswers] = useState<Record<string, unknown>>({});

  // Only fetched once the card is expanded and the template actually
  // requires one — no point fetching a form definition nobody's about
  // to fill out yet.
  const { data: requiredForm } = useQuery({
    queryKey: ["form", template.required_form_id],
    queryFn: () => sdk.form.getForm(template.required_form_id!),
    enabled: expanded && Boolean(template.required_form_id),
  });

  // Fetched regardless of expansion — shown on the collapsed card too,
  // so someone can see "this needs a subscription" before clicking in.
  const { data: requiredPlan } = useQuery({
    queryKey: ["subscription", "plan", template.required_subscription_plan_id],
    queryFn: () =>
      sdk.subscription.getPlan(template.required_subscription_plan_id!),
    enabled: Boolean(template.required_subscription_plan_id),
  });

  const { data: hasRequiredSubscription } = useQuery({
    queryKey: [
      "subscription",
      "has-active",
      actorId,
      template.required_subscription_plan_id,
    ],
    queryFn: () =>
      sdk.subscription.hasActiveSubscription(
        template.required_subscription_plan_id!,
      ),
    enabled: Boolean(template.required_subscription_plan_id),
  });

  const instantiateMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.instantiateTemplate(template.code, {
        actor_id: actorId,
        name: name || undefined,
        parent_container_id: asSubContainer
          ? (currentContainerId ?? undefined)
          : undefined,
        visibility_override: visibilityOverride || undefined,
        // No separate `allow_public_join_override` anymore — per the
        // visibility/join collapse, `allow_public_join` is DERIVED
        // from visibility everywhere now, not an independent setting.
        // See the visibility <select> below for exactly what each
        // value now means for joining, not just discovery.
        form_answers:
          template.required_form_id && Object.keys(formAnswers).length > 0
            ? formAnswers
            : undefined,
      }),
  });

  const result = instantiateMutation.data;
  const hasAnyAnswer = Object.values(formAnswers).some(
    (v) => v !== undefined && v !== null && v !== "",
  );
  const formIncomplete =
    Boolean(template.required_form_id) &&
    Boolean(requiredForm) &&
    // Two checks, not one: every individually-required field must be
    // filled (existing check) AND, separately, at least ONE answer
    // must exist at all — matching the backend's own requirement
    // (`form_answers` must be non-empty whenever `required_form_id`
    // is set, independent of whether any single field is marked
    // `required`). Without this second check, a form with zero
    // required fields would let the button stay enabled on a
    // completely empty submission, only for the server to correctly
    // reject it — a confusing "why did it let me click Submit" gap.
    (requiredForm!.fields
      .filter((f) => f.required)
      .some((f) => {
        const v = formAnswers[f.id];
        return v === undefined || v === null || v === "";
      }) ||
      !hasAnyAnswer);

  // Same "honest pre-check" pattern as formIncomplete above — if a
  // subscription is required and we already know it's missing, the
  // button is disabled BEFORE the click, not just after a 400.
  const subscriptionMissing =
    Boolean(template.required_subscription_plan_id) &&
    hasRequiredSubscription === false;

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start gap-2.5">
        <Layers size={16} className="mt-0.5 flex-none text-neutral-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{template.name}</p>
          {template.description && (
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              {template.description}
            </p>
          )}
          {template.requires_approval && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
              Requires approval before it's actually created.{" "}
              <Link
                to={`dashboard/my-instantiation-requests`}
                className="underline hover:text-black dark:hover:text-white"
              >
                View requests
              </Link>
            </p>
          )}
          {template.required_subscription_plan_id && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
              {hasRequiredSubscription ? (
                <>You have the required subscription.</>
              ) : (
                <>
                  Requires an active subscription
                  {requiredPlan && ` to "${requiredPlan.name}"`}.{" "}
                  <Link
                    to={`/dashboard/subscribe/plan/${template.required_subscription_plan_id}`}
                    className="underline hover:text-black dark:hover:text-white"
                  >
                    Subscribe
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`mt-3 self-start ${primaryButtonClass}`}
        >
          {template.requires_approval ? "Request" : "Instantiate"}
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <input
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            placeholder={`Name (defaults to "${template.name}")`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={asSubContainer}
              onChange={(e) => setAsSubContainer(e.target.checked)}
              disabled={!currentContainerId}
            />
            Create under my current container (otherwise a new root)
          </label>

          <details className="text-xs text-neutral-500 dark:text-neutral-500">
            <summary className="cursor-pointer select-none">
              Override visibility
            </summary>
            <div className="mt-2 flex flex-col gap-1.5 pl-1">
              {/*
                Single control now, not two. Visibility used to only
                govern DISCOVERY (whether a container shows up in
                search) while a separate `allow_public_join` flag
                governed JOINING — the two could independently
                disagree (e.g. discoverable but not joinable, or
                joinable but hidden). That's been collapsed: visibility
                is now the ONE setting for both, derived server-side,
                no longer independently settable. Concretely, per
                value:

                  public    — shows up in search AND anyone may join
                              directly.
                  protected — shows up in search, but joining requires
                              either an invitation or a request that
                              the container owner approves.
                  private   — hidden from search entirely; invitation
                              only, no self-service join or request
                              possible.

                There is no longer a way to make a container joinable
                without also making it discoverable, or vice versa —
                if that combination is ever genuinely needed again,
                that's a real backend decision to revisit, not
                something this form can express on its own.
              */}
              <select
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
                value={visibilityOverride}
                onChange={(e) =>
                  setVisibilityOverride(e.target.value as Visibility | "")
                }
              >
                <option value="">Use template's visibility default</option>
                <option value="public">
                  Public — discoverable, join instantly
                </option>
                <option value="protected">
                  Protected — discoverable, join by request/invite
                </option>
                <option value="private">Private — hidden, invite only</option>
              </select>
            </div>
          </details>

          {template.required_form_id && (
            <div className="mt-1 flex flex-col gap-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                {requiredForm ? requiredForm.title : "Loading form…"}
              </p>
              {requiredForm?.fields.map((field) => (
                <RequestFormField
                  key={field.id}
                  field={field}
                  value={formAnswers[field.id]}
                  onChange={(value) =>
                    setFormAnswers((prev) => ({ ...prev, [field.id]: value }))
                  }
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => instantiateMutation.mutate()}
            disabled={
              instantiateMutation.isPending ||
              formIncomplete ||
              subscriptionMissing
            }
            className={`self-start ${primaryButtonClass}`}
          >
            {instantiateMutation.isPending
              ? "Submitting…"
              : template.requires_approval
                ? "Submit request"
                : "Confirm"}
          </button>

          {result?.type === "container" && (
            <p className="text-xs text-black dark:text-white">
              Created "{result.container.display_name}" — you're its owner.
            </p>
          )}
          {result?.type === "instantiation_request" && (
            <p className="text-xs text-black dark:text-white">
              Request submitted — pending approval. Nothing's been created yet.
            </p>
          )}
          {instantiateMutation.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {instantiateMutation.error instanceof Error
                ? instantiateMutation.error.message
                : "Couldn't instantiate."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Non-document field types only, deliberately — a `document` answer
 * needs real file storage, and this form isn't submitting to Form's
 * own domain at all (it's just collecting data for a request payload
 * that may or may not ever get approved). If a required form has a
 * `document` field, this quietly can't collect it — a real, known gap
 * worth surfacing if it comes up, not something to fake with a
 * placeholder file input. */
function RequestFormField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900";

  const label = (
    <label className="text-xs font-medium">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </label>
  );

  if (field.type === "document") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          File upload isn't supported here yet — contact whoever manages this
          template.
        </p>
      </div>
    );
  }

  if (field.type === "long_text") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <textarea
          className={inputClass}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "single_choice") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <select
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {field.config.choices?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "multiple_choice") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-col gap-1">
        {label}
        <div className="flex flex-col gap-1">
          {field.config.choices?.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, c.id]
                      : selected.filter((id) => id !== c.id),
                  )
                }
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="number"
          className={inputClass}
          value={(value as number) ?? ""}
          min={field.config.min}
          max={field.config.max}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="date"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // "short_text" — default
  return (
    <div className="flex flex-col gap-1">
      {label}
      <input
        className={inputClass}
        maxLength={field.config.max_length}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
