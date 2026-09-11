import { useQuery } from "@tanstack/react-query";
import { sdk } from "../sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Real pre-check for whether the current actor holds
 * `core.events.event.manage` on the currently-selected container —
 * same pattern as useCanManageInventory. Note this is NOT the whole
 * authorization story for Events, unlike Inventory: the backend's own
 * rule is "owner OR role-holder" (see views.py's own
 * _forbid_unless_owner_or_manager), so a per-event action button also
 * needs to check event ownership directly — this hook only covers the
 * role half, used for the container-level "New event" control (which
 * has no per-event owner yet) and as one half of each event row's own
 * combined check.
 */
export function useCanManageEvents() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: [
      "authorize",
      user?.id,
      currentContainerId,
      "core.events.event.manage",
    ],
    queryFn: async () => {
      const decision = await sdk.authority.authorize({
        actor_id: user!.id,
        container_id: currentContainerId!,
        permission_code: "core.events.event.manage",
      });
      return decision.allowed;
    },
    enabled: Boolean(user && currentContainerId),
    staleTime: 10_000,
  });
}
