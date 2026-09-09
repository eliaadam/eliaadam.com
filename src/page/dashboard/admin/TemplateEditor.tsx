import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  sdk,
  type AccessMode,
  type ContainerTemplate,
  type Visibility,
} from "../../../lib/sdk";
import { useAuth } from "../../../components/context/Authcontext";
import { useContainer } from "../../../components/context/ContainerContext";
import { TemplateTree } from "../../../components/admin/TemplateTree";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

// FIX: every primary button in this file used `bg-black ... text-white
// ... dark:bg-white` with NO `dark:text-black` — in dark mode the
// background correctly flips to white, but the text stays white too,
// making every one of these buttons render white-on-white and
// unreadable. One shared constant now, `dark:text-black` added,
// so this can't drift out of sync across the file's several buttons
// again.
const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

export function TemplateEditor({ template }: { template: ContainerTemplate }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "template-children"] });
  };

  // -- Policy / basics form ---------------------------------------------

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    template.default_visibility,
  );
  const [allowPublicJoin, setAllowPublicJoin] = useState(
    template.allow_public_join,
  );
  const [maximumChildren, setMaximumChildren] = useState(
    template.maximum_children?.toString() ?? "",
  );
  const [maximumDepth, setMaximumDepth] = useState(
    template.maximum_depth?.toString() ?? "",
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.updateTemplate(template.code, {
        name,
        description: description || undefined,
        default_visibility: visibility,
        allow_public_join: allowPublicJoin,
        maximum_children: maximumChildren ? Number(maximumChildren) : undefined,
        maximum_depth: maximumDepth ? Number(maximumDepth) : undefined,
      }),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: () => sdk.provisioning.archiveTemplate(template.code),
    onSuccess: invalidate,
  });

  // -- Capabilities -------------------------------------------------------

  const allManifestsQuery = useQuery({
    queryKey: ["capability", "manifests", "all"],
    queryFn: () => sdk.capability.listManifests(),
  });
  const addedFeatureCodes = new Set(
    template.capabilities.map((c) => c.feature_code),
  );
  const capabilityChoices = (allManifestsQuery.data ?? []).filter(
    (m) => !addedFeatureCodes.has(m.feature_code),
  );

  const [newFeatureCode, setNewFeatureCode] = useState("");
  const [newAccessMode, setNewAccessMode] =
    useState<AccessMode>("role_required");

  const capabilitiesMutation = useMutation({
    mutationFn: (capabilities: ContainerTemplate["capabilities"]) =>
      sdk.provisioning.updateTemplate(template.code, { capabilities }),
    onSuccess: invalidate,
  });

  const addCapability = () => {
    if (!newFeatureCode.trim()) return;
    capabilitiesMutation.mutate([
      ...template.capabilities,
      { feature_code: newFeatureCode.trim(), access_mode: newAccessMode },
    ]);
    setNewFeatureCode("");
  };

  const removeCapability = (featureCode: string) => {
    capabilitiesMutation.mutate(
      template.capabilities.filter((c) => c.feature_code !== featureCode),
    );
  };

  // -- Instantiation rules (form / approval / subscription) ---------------

  const [requiresApproval, setRequiresApproval] = useState(
    template.requires_approval ?? false,
  );
  const [requiredFormId, setRequiredFormId] = useState(
    template.required_form_id ?? "",
  );
  const [requiredSubscriptionPlanId, setRequiredSubscriptionPlanId] = useState(
    template.required_subscription_plan_id ?? "",
  );

  const { data: availableForms } = useQuery({
    queryKey: ["form", "list", currentContainerId],
    queryFn: () => sdk.form.listForms(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const { data: availablePlans } = useQuery({
    queryKey: ["subscription", "plans", currentContainerId],
    queryFn: () => sdk.subscription.listPlansForContainer(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const rulesMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.updateTemplate(template.code, {
        requires_approval: requiresApproval,
        required_form_id: requiredFormId || undefined,
        required_subscription_plan_id: requiredSubscriptionPlanId || undefined,
      }),
    onSuccess: invalidate,
  });

  // -- Instantiate ----------------------------------------------------------

  const [instanceName, setInstanceName] = useState("");
  const [useCurrentAsParent, setUseCurrentAsParent] = useState(false);
  const [visibilityOverride, setVisibilityOverride] = useState<Visibility | "">(
    "",
  );
  const [allowPublicJoinOverride, setAllowPublicJoinOverride] = useState<
    "" | "true" | "false"
  >("");

  const instantiateMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.instantiateTemplate(template.code, {
        actor_id: user!.id,
        name: instanceName || undefined,
        parent_container_id: useCurrentAsParent
          ? (currentContainerId ?? undefined)
          : undefined,
        visibility_override: visibilityOverride || undefined,
        allow_public_join_override:
          allowPublicJoinOverride === ""
            ? undefined
            : allowPublicJoinOverride === "true",
      }),
  });
  const instantiateResult = instantiateMutation.data;

  const handleSaveSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Basics + policy */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight">
          Basics & default policy
        </h2>
        <form onSubmit={handleSaveSubmit} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Description
            </label>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Visibility
              </label>
              <select
                className={inputClass}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
              >
                <option value="public">Public</option>
                <option value="protected">Protected</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Max children
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={maximumChildren}
                onChange={(e) => setMaximumChildren(e.target.value)}
                placeholder="unlimited"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Max depth
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={maximumDepth}
                onChange={(e) => setMaximumDepth(e.target.value)}
                placeholder="unlimited"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowPublicJoin}
              onChange={(e) => setAllowPublicJoin(e.target.checked)}
            />
            Allow public join
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className={`self-start ${primaryButtonClass}`}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Archive template
            </button>
          </div>
        </form>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight">
          Capabilities to license
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          Automatically licensed on every container instantiated from this
          template.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {template.capabilities.map((cap) => (
            <li
              key={cap.feature_code}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            >
              <span>
                {cap.feature_code}{" "}
                <span className="text-xs text-neutral-500 dark:text-neutral-500">
                  ({cap.access_mode})
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeCapability(cap.feature_code)}
                aria-label={`Remove ${cap.feature_code}`}
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <select
            className={`${inputClass} flex-1`}
            value={newFeatureCode}
            onChange={(e) => setNewFeatureCode(e.target.value)}
          >
            <option value="">Choose a capability…</option>
            {capabilityChoices.map((m) => (
              <option key={m.feature_code} value={m.feature_code}>
                {m.display_name} ({m.feature_code})
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={newAccessMode}
            onChange={(e) => setNewAccessMode(e.target.value as AccessMode)}
          >
            <option value="role_required">role_required</option>
            <option value="open_to_members">open_to_members</option>
          </select>
          <button
            type="button"
            disabled={!newFeatureCode}
            onClick={addCapability}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Add
          </button>
        </div>
      </section>

      {/* Instantiation rules (form / approval / subscription) */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight">
          Instantiation rules
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          Three independent, composable gates — require an active subscription,
          gate behind approval, and (within an approval flow) optionally require
          a form to be filled out first. Root-level approval requests need an
          actor with `core.admin.instantiation.approve`; sub-container requests
          need that container's real owner.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
            />
            Requires approval before actually instantiating
          </label>

          {requiresApproval && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Required form (optional)
              </label>
              <select
                className={inputClass}
                value={requiredFormId}
                onChange={(e) => setRequiredFormId(e.target.value)}
                disabled={!currentContainerId}
              >
                <option value="">No form required</option>
                {availableForms?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
              {!currentContainerId && (
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  Select a container first to browse its forms.
                </p>
              )}
              {currentContainerId && (
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  Only forms in your currently selected container are shown.
                </p>
              )}
            </div>
          )}

          {/* Deliberately OUTSIDE the requiresApproval block — a
              subscription requirement blocks instantiation on its own,
              independent of whether approval is also required. See
              TemplateInstantiationService.instantiate()'s own
              docstring for the exact check order. */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Required subscription plan (optional)
            </label>
            <select
              className={inputClass}
              value={requiredSubscriptionPlanId}
              onChange={(e) => setRequiredSubscriptionPlanId(e.target.value)}
              disabled={!currentContainerId}
            >
              <option value="">No subscription required</option>
              {availablePlans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currency} {(p.price / 100).toFixed(2)}/
                  {p.billing_interval === "monthly" ? "mo" : "yr"})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Blocks instantiation on its own — checked before, and independent
              of, the approval requirement above. Only plans on your currently
              selected container are shown.
            </p>
          </div>

          <button
            type="button"
            onClick={() => rulesMutation.mutate()}
            disabled={rulesMutation.isPending}
            className={`self-start ${primaryButtonClass}`}
          >
            {rulesMutation.isPending ? "Saving…" : "Save rules"}
          </button>
        </div>
      </section>

      {/* Sub-hierarchy — the interactive tree IS the editor now, not a
          preview alongside a separate flat form. Add or remove a child
          at ANY node here, at any depth — not just this template's own
          direct children. See TemplateTree's own docstring for the full
          story on the old, depth-1-only limitation this replaces. */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight">Sub-hierarchy</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          Other templates instantiated automatically underneath this one. Click
          "+ add child" on any node — including nested ones — to build multiple
          levels deep in one flow. Only templates of a different kind, with no
          sub-hierarchy of their own, are offered as candidates at each node.
        </p>
        <div className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <TemplateTree templateCode={template.code} />
        </div>
      </section>

      {/* Instantiate */}
      <section className="rounded-lg border border-neutral-300 bg-neutral-100/50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
        <h2 className="text-sm font-semibold tracking-tight">Instantiate</h2>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Creates a real container (and its whole sub-hierarchy) from this
          template. You become its owner automatically.
        </p>
        {template.requires_approval && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            This template requires approval — clicking Instantiate below submits
            a request instead of building anything immediately. If it also
            requires a form, fill it out from the Templates page instead; this
            quick admin flow doesn't collect form answers.
          </p>
        )}
        {template.required_subscription_plan_id && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            This template also requires the instantiating actor to have an
            active subscription to a specific plan — that's checked server-side
            regardless of who clicks Instantiate here.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          <input
            className={inputClass}
            placeholder={`Name (defaults to "${template.name}")`}
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCurrentAsParent}
              onChange={(e) => setUseCurrentAsParent(e.target.checked)}
              disabled={!currentContainerId}
            />
            Create as a sub-container of my currently selected container
            {!useCurrentAsParent && " (otherwise creates a new root container)"}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Visibility override
              </label>
              <select
                className={`${inputClass} mt-1 block w-full`}
                value={visibilityOverride}
                onChange={(e) =>
                  setVisibilityOverride(e.target.value as Visibility | "")
                }
              >
                <option value="">Use template default</option>
                <option value="public">Public</option>
                <option value="protected">Protected</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Join policy override
              </label>
              <select
                className={`${inputClass} mt-1 block w-full`}
                value={allowPublicJoinOverride}
                onChange={(e) =>
                  setAllowPublicJoinOverride(
                    e.target.value as "" | "true" | "false",
                  )
                }
              >
                <option value="">Use template default</option>
                <option value="true">Allow public join</option>
                <option value="false">Require invitation</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => instantiateMutation.mutate()}
            disabled={instantiateMutation.isPending}
            className={`self-start ${primaryButtonClass}`}
          >
            {instantiateMutation.isPending
              ? "Submitting…"
              : template.requires_approval
                ? "Submit request"
                : "Instantiate"}
          </button>
          {instantiateResult?.type === "container" && (
            <p className="text-sm text-black dark:text-white">
              Created "{instantiateResult.container.display_name}" — you're its
              owner.
            </p>
          )}
          {instantiateResult?.type === "instantiation_request" && (
            <p className="text-sm text-black dark:text-white">
              Request submitted — pending approval. Nothing's been created yet.
            </p>
          )}
          {instantiateMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {instantiateMutation.error instanceof Error
                ? instantiateMutation.error.message
                : "Couldn't instantiate — check the template's container kind exists and try again."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
