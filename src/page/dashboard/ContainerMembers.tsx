import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { sdk, type Actor, type CapabilityManifest } from "../../lib/sdk";
import { useCanManageMembers } from "../../lib/hooks/useCanManageMembers";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Container member management — list who's in this container, remove
 * a member, grant them a real Authority role.
 *
 * "Available roles" = "member" (always) + every role declared by a
 * capability actually LICENSED on this container — from
 * `sdk.capability.listManifests(containerId)`, filtered to
 * `licensed === true`, flattening `.roles`. Not gated by
 * `usePermission` here — same "no ownership enforcement anywhere in
 * this codebase yet" reality already noted on the Invitations page;
 * this page is reachable from "My Containers" for any container the
 * signed-in actor belongs to.
 */
export function ContainerMembers() {
  const { containerId } = useParams<{ containerId: string }>();
  const queryClient = useQueryClient();
  const { canManage, isLoading: permissionLoading } =
    useCanManageMembers(containerId);

  const membersQuery = useQuery({
    queryKey: ["container", containerId, "members"],
    queryFn: () => sdk.container.listMembers(containerId!),
    enabled: Boolean(containerId),
  });

  const roleAssignmentsQuery = useQuery({
    queryKey: ["container", containerId, "role-assignments"],
    queryFn: () => sdk.authority.listContainerRoleAssignments(containerId!),
    enabled: Boolean(containerId),
  });

  const manifestsQuery = useQuery({
    queryKey: ["capability", "manifests", containerId],
    queryFn: () => sdk.capability.listManifests(containerId),
    enabled: Boolean(containerId),
  });

  const actorsQuery = useQuery({
    queryKey: ["actors", "all"],
    queryFn: () => sdk.identity.listActors({ limit: 200 }),
  });

  // "container-owner" is a real, base seeded Authority role (spec
  // §9.2's auto-grant target — see
  // `AUTHORITY_CONTAINER_OWNER_ROLE_CODE`), included here alongside
  // "member" as an always-available option so ownership can be
  // GRANTED to someone through the same picker as any other role, not
  // just auto-assigned at container creation.
  const availableRoles: { code: string; label: string }[] = [
    { code: "member", label: "Member" },
    { code: "container-owner", label: "Container Owner" },
    ...((manifestsQuery.data ?? []) as CapabilityManifest[])
      .filter((m) => m.licensed)
      .flatMap((m) => m.roles.map((r) => ({ code: r.code, label: r.label }))),
  ];

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["container", containerId, "members"],
    });
    queryClient.invalidateQueries({
      queryKey: ["container", containerId, "role-assignments"],
    });
  };

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) =>
      sdk.container.terminateMembership(membershipId),
    onSuccess: invalidateAll,
  });

  const revokeRoleMutation = useMutation({
    mutationFn: (roleAssignmentId: string) =>
      sdk.authority.revokeRoleAssignment(roleAssignmentId),
    onSuccess: invalidateAll,
  });

  const [grantingFor, setGrantingFor] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState("");

  const grantMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.authority.assignRoleByCode({
        container_id: containerId!,
        actor_id: actorId,
        role_code: roleCode,
      }),
    onSuccess: () => {
      invalidateAll();
      setGrantingFor(null);
      setRoleCode("");
    },
  });

  const actorName = (actorId: string): string => {
    const actor = actorsQuery.data?.find((a: Actor) => a.id === actorId);
    return actor?.display_name ?? actorId;
  };

  const rolesFor = (actorId: string) =>
    (roleAssignmentsQuery.data ?? []).filter((ra) => ra.actor_id === actorId);

  return (
    <div className="max-w-2xl">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to containers
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">Members</h1>

      {!permissionLoading && !canManage && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          You can view this container's members, but only its owner can remove
          someone or change their role.
        </p>
      )}

      {membersQuery.isLoading && (
        <ul className="mt-6 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </ul>
      )}

      {membersQuery.data && membersQuery.data.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
          No active members.
        </p>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {membersQuery.data?.map((member) => (
          <li key={member.id} className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {actorName(member.actor_id)}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                  {member.role}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setGrantingFor(
                          grantingFor === member.actor_id
                            ? null
                            : member.actor_id,
                        )
                      }
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900"
                    >
                      <UserPlus size={13} />
                      Grant role
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(member.id)}
                      disabled={
                        removeMutation.isPending &&
                        removeMutation.variables === member.id
                      }
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            {rolesFor(member.actor_id).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rolesFor(member.actor_id).map((ra) => (
                  <RoleBadge
                    key={ra.id}
                    roleId={ra.role_id}
                    onRevoke={
                      canManage
                        ? () => revokeRoleMutation.mutate(ra.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {grantingFor === member.actor_id && (
              <div className="flex items-center gap-2 pt-1">
                <select
                  className={`${inputClass} flex-1`}
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                >
                  <option value="">Choose a role…</option>
                  {availableRoles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!roleCode || grantMutation.isPending}
                  onClick={() => grantMutation.mutate(member.actor_id)}
                  className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  Grant
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fetches its own role name by id (cached per role_id via
 * react-query) — `RoleAssignment.role_id` is Authority's internal
 * UUID, not a code, and nothing in the capability-manifest data can
 * resolve that UUID back to a label. Uses the pre-existing
 * `GET /api/authority/roles/<id>/` endpoint (already in this
 * codebase, not something added for this feature). */
function RoleBadge({
  roleId,
  onRevoke,
}: {
  roleId: string;
  onRevoke?: () => void;
}) {
  const { data: role } = useQuery({
    queryKey: ["authority", "role", roleId],
    queryFn: () => sdk.authority.getRole(roleId),
  });

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
      {role?.name ?? "…"}
      {onRevoke && (
        <button
          type="button"
          onClick={onRevoke}
          aria-label="Revoke role"
          className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
        >
          ×
        </button>
      )}
    </span>
  );
}
