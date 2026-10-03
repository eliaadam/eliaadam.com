import { useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Check, Copy, Search } from "lucide-react";
import {
  sdk,
  type Actor,
  type CapabilityManifest,
  type Container,
  type Invitation,
} from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Guided invitation creation — no raw ids. Pick a container you OWN,
 * search for a user, pick a role that's actually assignable there,
 * set an optional expiry, create, copy the code.
 *
 * STRICT BY DESIGN: `invitee_actor_id` is required — an invitation
 * always names exactly one intended recipient, enforced server-side
 * too (`InvitationService.redeem()` rejects a mismatched actor with a
 * 403 — this isn't just UI politeness).
 *
 * The role picker's options are the SAME "member" + licensed
 * capability roles source `ContainerMembers.tsx` uses — picking one
 * populates `assigned_role_codes`, which is what actually grants a
 * real Authority role on redemption (wired at
 * `domains/container/interface/dependencies.py::_grant_authority_roles`).
 *
 * FIX (this revision) — "Containers you can invite for" used to mean
 * "containers you're a MEMBER of", full stop. The backend's own
 * `can_invite_actor` rule only checks the container's policy
 * (`allow_invitations`), not who's asking — so ANY member of ANY
 * container could invite someone into it and grant them ANY role,
 * including `container-owner` itself, with zero ownership check
 * anywhere. The picker now only lists containers the current actor
 * actually OWNS — checked both ways, since this codebase has real
 * containers (the system and admin containers — see
 * `core.seeders.system_admin`'s own fix notes) that were deliberately
 * seeded with NO creator field at all, ownership held purely via a
 * granted `container-owner` role instead. Missing either signal would
 * wrongly hide containers from their legitimate owner.
 *
 * THIS IS STILL NOT A REAL SECURITY BOUNDARY — same honest caveat as
 * before, just narrower now: nothing stops a determined caller from
 * hitting `createInvitation` directly with any `container_id` and any
 * `assigned_role_codes`, including `container-owner`, since the
 * backend genuinely enforces none of this. Closing that for real needs
 * the same Ownership-OR-Authority check already built for Authority's
 * own role-assignment endpoints this session
 * (`require_role_assignment_access` in `authority/interface/views.py`)
 * applied to Container's invitation-creation path instead — not done
 * here because that requires seeing Container's actual
 * `InvitationService`/views code, which wasn't available to write
 * against without guessing.
 */
export function Invitations() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Invitations</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Invite a specific person to a specific container, with a real role. Only
        they can redeem it.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <CreateInvitationForm actorId={user!.id} />
        <RedeemInvitationForm actorId={user!.id} />
      </div>
    </div>
  );
}

/**
 * Both signals `is_container_owner()` itself would recognize
 * server-side: the container's own `container_owner_id` field (set
 * for ordinary containers created the normal way), OR a `role_id`
 * that resolves to the `container-owner` role code (how ownership is
 * granted on containers seeded without a creator, and how ownership
 * CAN be re-granted to someone else on any container via the role
 * picker in `ContainerMembers.tsx`).
 *
 * Batched with `useQueries` across every container the actor belongs
 * to, rather than one `useCanManageMembers`-style call per container
 * — same underlying endpoints and query keys as
 * `ContainerMembers.tsx`/`RoleBadge` (`["container", id,
 * "role-assignments"]`, `["authority", "role", roleId]`), so this
 * benefits from — and contributes to — the same cache rather than
 * duplicating requests across pages.
 *
 * TRADE-OFF worth knowing: for a container the actor is a plain
 * member of (not owner), the role-assignments query now correctly
 * 403s under `require_role_assignment_access`'s ownership-or-admin
 * check — expected and harmless (treated here as "not owned"), but it
 * does mean one failed request per non-owned container on every load
 * of this page. A dedicated "containers I own" backend endpoint would
 * avoid that; not built here since it wasn't asked for and doesn't
 * exist yet.
 */
function useOwnedContainerIds(
  containers: Container[],
  actorId: string | undefined,
) {
  const assignmentQueries = useQueries({
    queries: containers.map((c) => ({
      queryKey: ["container", c.id, "role-assignments"] as const,
      queryFn: () => sdk.authority.listContainerRoleAssignments(c.id),
      enabled: Boolean(actorId),
      retry: false,
    })),
  });

  const myAssignmentsByContainer = containers.map((c, i) => ({
    containerId: c.id,
    assignments: (assignmentQueries[i].data ?? []).filter(
      (ra) => ra.actor_id === actorId,
    ),
  }));

  const myRoleIds = Array.from(
    new Set(
      myAssignmentsByContainer.flatMap((x) =>
        x.assignments.map((a) => a.role_id),
      ),
    ),
  );

  const roleQueries = useQueries({
    queries: myRoleIds.map((roleId) => ({
      queryKey: ["authority", "role", roleId] as const,
      queryFn: () => sdk.authority.getRole(roleId),
    })),
  });

  const roleCodeById = new Map(
    myRoleIds.map((id, i) => [id, roleQueries[i].data?.code]),
  );

  const ownedIds = new Set(
    containers
      .filter((c) => {
        if (c.container_owner_id === actorId) return true;
        const mine = myAssignmentsByContainer.find(
          (x) => x.containerId === c.id,
        );
        return (mine?.assignments ?? []).some(
          (ra) => roleCodeById.get(ra.role_id) === "container-owner",
        );
      })
      .map((c) => c.id),
  );

  const isLoading =
    assignmentQueries.some((q) => q.isLoading) ||
    roleQueries.some((q) => q.isLoading);

  return { ownedIds, isLoading };
}

function CreateInvitationForm({ actorId }: { actorId: string }) {
  const { containers } = useContainer();
  const { ownedIds, isLoading: ownershipLoading } = useOwnedContainerIds(
    containers,
    actorId,
  );
  const ownedContainers = containers.filter((c) => ownedIds.has(c.id));

  const [containerId, setContainerId] = useState("");
  const [search, setSearch] = useState("");
  const [invitee, setInvitee] = useState<Actor | null>(null);
  const [roleCode, setRoleCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [created, setCreated] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const actorsQuery = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () =>
      sdk.identity.listActors({
        search,
        limit: 10,
        containerId: "",
      }),
    enabled: search.trim().length > 1,
  });

  const manifestsQuery = useQuery({
    queryKey: ["capability", "manifests", containerId],
    queryFn: () => sdk.capability.listManifests(containerId),
    enabled: Boolean(containerId),
  });

  // "container-owner" is a real, base seeded Authority role (spec
  // §9.2's auto-grant target — see
  // `AUTHORITY_CONTAINER_OWNER_ROLE_CODE`), included here alongside
  // "member" as an always-available option so ownership can be
  // GRANTED to someone through the same picker as any other role, not
  // just auto-assigned at container creation. Safe to still offer
  // unconditionally here now that the container picker above it is
  // itself scoped to containers the current actor owns — only an
  // actual owner reaches this option at all.
  const availableRoles: { code: string; label: string }[] = [
    { code: "member", label: "Member" },
    { code: "container-owner", label: "Container Owner" },
    ...((manifestsQuery.data ?? []) as CapabilityManifest[])
      .filter((m) => m.licensed)
      .flatMap((m) => m.roles.map((r) => ({ code: r.code, label: r.label }))),
  ];

  const mutation = useMutation({
    mutationFn: () =>
      sdk.container.createInvitation({
        container_id: containerId,
        invited_by_actor_id: actorId,
        invitee_actor_id: invitee!.id,
        role: "member",
        type: "actor",
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        assigned_role_codes: roleCode ? [roleCode] : undefined,
      }),
    onSuccess: (invitation) => setCreated(invitation),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const copyCode = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">
        Create an invitation
      </h2>

      {ownershipLoading ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          Checking which containers you own…
        </p>
      ) : ownedContainers.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          You don't own any containers yet — only a container's owner can send
          invitations for it, including granting Container Owner to someone
          else.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Container
            </label>
            <select
              className={inputClass}
              required
              value={containerId}
              onChange={(e) => {
                setContainerId(e.target.value);
                setRoleCode("");
              }}
            >
              <option value="">Choose a container…</option>
              {ownedContainers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Invitee <span className="text-red-500">*</span>
            </label>
            {invitee ? (
              <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-neutral-100/50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
                <span>{invitee.display_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setInvitee(null);
                    setSearch("");
                  }}
                  className="text-xs text-neutral-500 hover:underline dark:text-neutral-500"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  className={`${inputClass} w-full pl-8`}
                  placeholder="Search by name or code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {actorsQuery.data && actorsQuery.data.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    {actorsQuery.data.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setInvitee(a);
                            setSearch("");
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          {a.display_name}
                          {a.code && (
                            <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-500">
                              {a.code}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Role to grant
            </label>
            <select
              className={inputClass}
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              disabled={!containerId}
            >
              <option value="">No role (membership only)</option>
              {availableRoles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Expires (optional)
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!containerId || !invitee || mutation.isPending}
            className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {mutation.isPending ? "Creating…" : "Create invitation"}
          </button>
          {mutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Couldn't create an invitation — check that this container's policy
              allows invitations.
            </p>
          )}
        </form>
      )}

      {created && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-100/50 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
          <div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Share this code:
            </p>
            <p className="mt-1 font-mono text-sm font-medium">{created.code}</p>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 dark:text-white dark:hover:bg-neutral-900"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </section>
  );
}

function RedeemInvitationForm({ actorId }: { actorId: string }) {
  const { refresh } = useContainer();
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.container.redeemInvitation({ code, actor_id: actorId }),
    onSuccess: refresh,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 403
      ? "This invitation was issued for a different actor."
      : mutation.error
        ? "Couldn't redeem that code — check it's correct and not expired."
        : null;

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">
        Redeem an invitation
      </h2>
      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Code
          </label>
          <input
            className={inputClass}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Redeeming…" : "Redeem"}
        </button>
      </form>
      {mutation.isSuccess && (
        <p className="mt-2 text-sm text-black dark:text-white">
          Joined — switch to it from the sidebar.
        </p>
      )}
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
