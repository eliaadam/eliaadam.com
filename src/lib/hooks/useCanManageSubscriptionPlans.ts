import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Real pre-check for whether the current actor can manage
 * subscription plans on the currently-selected container —
 * `core.subscription.plan.manage` is a genuine permission code,
 * checked via the same Gate the backend itself uses. Same pattern as
 * `useCanApproveRootInstantiation` — an honest, up-front check so
 * admin controls (create/archive) can be hidden rather than shown and
 * then 403'd after a click.
 */
export function useCanManageSubscriptionPlans() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: [
      "authorize",
      user?.id,
      currentContainerId,
      "core.subscription.plan.manage",
    ],
    queryFn: async () => {
      const decision = await sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: "core.subscription.plan.manage",
      });
      return decision.allowed;
    },
    enabled: Boolean(user && currentContainerId),
    staleTime: 10_000,
  });
}
