import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Real pre-check for whether the current actor could approve a
 * ROOT-level instantiation request from their currently-selected
 * container — `core.admin.instantiation.approve` is a genuine
 * permission code, so this is a real, honest check via the same Gate
 * the backend itself uses, not a guess.
 *
 * Deliberately does NOT cover sub-container approval — that's a
 * direct `is_container_owner()` check on the backend, bypassing
 * Authority's Gate entirely by design (see
 * `container_ownership.py`'s own docstring), which means there's no
 * permission code to check here and no lightweight way to answer
 * "am I this container's owner" from the frontend today. Screens
 * using this hook show sub-container approve/reject buttons as
 * always-enabled and let a real 403 explain itself after the fact —
 * a known, deliberate gap, not an oversight.
 */
export function useCanApproveRootInstantiation() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: [
      "authorize",
      user?.id,
      currentContainerId,
      "core.admin.instantiation.approve",
    ],
    queryFn: async () => {
      const decision = await sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: "core.admin.instantiation.approve",
      });
      return decision.allowed;
    },
    enabled: Boolean(user && currentContainerId),
    staleTime: 10_000,
  });
}
