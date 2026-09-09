import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Real per-permission Gate checks, not a precomputed client-side
 * permission set.
 *
 * Deliberately NOT built on `effective_permissions()` (the "give me
 * everything this actor can do here" endpoint) — that endpoint's own
 * backend docstring flags a real limitation: it only enumerates
 * EXPLICIT role-permission grants. A wildcard role's true access is
 * never expanded into that list. Driving UI controls off it would mean
 * a wildcard admin sees FEWER controls than they can actually use —
 * wrong for exactly the accounts most likely to need every control
 * visible. `authorize()` runs the real seven-step Gate (including the
 * wildcard check) for one specific permission, so that's what this
 * hook calls, once per permission a page actually cares about.
 *
 * Cached per (actor, container, permission) via react-query's own
 * query-key deduplication — checking the same permission from two
 * components on the same page only fires one request.
 *
 * Usage:
 * const { data: canDelete } = usePermission("system.document.document.delete");
 * {canDelete && <button>Delete</button>}
 */
export function usePermission(permissionCode: string | null) {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: ["authorize", user?.id, currentContainerId, permissionCode],
    queryFn: async () => {
      const decision = await sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: permissionCode!,
      });
      return decision.allowed;
    },
    enabled: Boolean(user && currentContainerId && permissionCode),
    // Authorization can change (a role gets revoked, a feature gets
    // unlicensed) without the person refreshing — don't treat a stale
    // "allowed" as good indefinitely the way read-only catalogue data
    // can afford to (contrast with queryClient's global 30s staleTime).
    staleTime: 10_000,
  });
}
