import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";

/**
 * FRONTEND-ONLY safety gate — hides destructive member-management
 * actions (remove, grant role) unless the current actor appears to
 * own this container. This is NOT real security: Container's own
 * backend enforces no ownership check on membership/role-assignment
 * endpoints at all (same "no authorization enforcement in this
 * layer" reality flagged throughout this codebase) — a determined
 * caller could still hit the API directly with any container id. What
 * this DOES fix is the concrete, easy-to-hit risk that any signed-in
 * actor holding the default "member" role could reach and use this
 * UI just by knowing a container id — closing that is worth doing
 * even though it isn't a full security boundary.
 *
 * "Owner" means either: the container's original creator
 * (`container.container_owner_id`), OR anyone since GRANTED the
 * "container-owner" role there — ownership is a real, grantable role
 * now (see the role picker in ContainerMembers/Invitations), not just
 * whoever happened to create it.
 */
export function useCanManageMembers(containerId: string | undefined) {
  const { user } = useAuth();

  const containerQuery = useQuery({
    queryKey: ["container", containerId],
    queryFn: () => sdk.container.getContainer(containerId!),
    enabled: Boolean(containerId),
  });

  const roleAssignmentsQuery = useQuery({
    queryKey: ["container", containerId, "role-assignments"],
    queryFn: () => sdk.authority.listContainerRoleAssignments(containerId!),
    enabled: Boolean(containerId),
  });

  const myAssignments = (roleAssignmentsQuery.data ?? []).filter(
    (ra) => ra.actor_id === user?.id,
  );

  const myRolesQuery = useQuery({
    queryKey: [
      "authority",
      "my-roles",
      containerId,
      myAssignments.map((a) => a.role_id).join(","),
    ],
    queryFn: () =>
      Promise.all(myAssignments.map((ra) => sdk.authority.getRole(ra.role_id))),
    enabled: myAssignments.length > 0,
  });

  const isCreator = Boolean(
    containerQuery.data &&
    user &&
    containerQuery.data.container_owner_id === user.id,
  );
  const holdsOwnerRole = (myRolesQuery.data ?? []).some(
    (r) => r.code === "container-owner",
  );

  return {
    canManage: isCreator || holdsOwnerRole,
    isLoading:
      containerQuery.isLoading ||
      roleAssignmentsQuery.isLoading ||
      (myAssignments.length > 0 && myRolesQuery.isLoading),
  };
}
