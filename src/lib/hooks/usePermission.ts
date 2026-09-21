import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Mirrors the backend's `AuthorizationDecision` (domains/authority/domain/gate.py).
 * `reason` and `strategy` are the DenyReason / GrantStrategy enum VALUES
 * as strings (e.g. "NOT_LICENSED", "WILDCARD") — confirm the exact
 * casing/format against `value_objects.py` before relying on it for
 * anything beyond a switch/lookup keyed by these strings, since that
 * file wasn't in scope here and enum `.value`s are easy to get subtly
 * wrong by assumption.
 */
export interface AuthorizationDecision {
  allowed: boolean;
  permission: string;
  reason: string;
  strategy: string;
}

/**
 * The one real query — everything below is a view over this same
 * cache entry via React Query's `select`, so usePermission() and
 * usePermissionDecision() called for the same permission in the same
 * render tree share a single network call, not two.
 */
function useAuthorizationQuery<T = AuthorizationDecision>(
  permissionCode: string | null,
  select?: (decision: AuthorizationDecision) => T,
) {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: ["authorize", user?.id, currentContainerId, permissionCode],
    queryFn: async (): Promise<AuthorizationDecision> => {
      return sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: permissionCode!,
      });
    },
    select,
    enabled: Boolean(user && currentContainerId && permissionCode),
    // Authorization can change (a role gets revoked, a feature gets
    // unlicensed) without the person refreshing — don't treat a stale
    // "allowed" as good indefinitely the way read-only catalogue data
    // can afford to (contrast with queryClient's global 30s staleTime).
    staleTime: 10_000,
  });
}

/**
 * Original hook, UNCHANGED signature and return shape (`data` is a
 * plain boolean) — every existing hide/show call site keeps working
 * with no edits. Use this whenever a simple yes/no is all the UI
 * needs (nav items, showing/hiding a whole section).
 *
 * const { data: canDelete } = usePermission("system.document.document.delete");
 * {canDelete && <button>Delete</button>}
 */
export function usePermission(permissionCode: string | null) {
  return useAuthorizationQuery(permissionCode, (decision) => decision.allowed);
}

/**
 * New — returns the FULL decision, not just the boolean. Use this
 * whenever the UI needs to explain WHY something is denied (a
 * disabled button with a tooltip, a full-page empty state) rather
 * than just disappearing.
 *
 * const { data: decision } = usePermissionDecision("core.payment.wallet.create_shared");
 * if (!decision?.allowed) show something using decision?.reason
 */
export function usePermissionDecision(permissionCode: string | null) {
  return useAuthorizationQuery(permissionCode);
}