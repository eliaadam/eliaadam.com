import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Real pre-check for whether the current actor can manage inventory
 * items on the currently-selected container —
 * `core.inventory.item.manage`, checked via the same Gate the backend
 * itself uses. Same pattern as `useCanManageMarketplaceListings` — an
 * honest, up-front check so management controls can be hidden rather
 * than shown and then 403'd after a click.
 */
export function useCanManageInventory() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: [
      "authorize",
      user?.id,
      currentContainerId,
      "core.inventory.item.manage",
    ],
    queryFn: async () => {
      const decision = await sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: "core.inventory.item.manage",
      });
      return decision.allowed;
    },
    enabled: Boolean(user && currentContainerId),
    staleTime: 10_000,
  });
}
