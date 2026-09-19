import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { useAuth } from "../context/Authcontext";

/**
 * Resolves a single actor's display name by id.
 *
 * Replaces the `listActors({ limit: 200 })` + client-side `.find()`
 * pattern that used to live in ConversationThread: that scan silently
 * went blind past 200 actors and re-fetched the entire actor list on
 * every conversation. `getActor(id)` is a direct lookup, and
 * react-query caches it per id, so rendering the same sender across
 * many messages costs one request per unique actor, not per message.
 *
 * Returns `undefined` while loading/unknown, "You" for the current
 * user, and the actor's `display_name` (falling back to the raw id)
 * once resolved.
 */
export function useActorName(actorId?: string): string | undefined {
  const { user } = useAuth();
  const isSelf = Boolean(actorId) && actorId === user?.id;

  const { data } = useQuery({
    queryKey: ["actor", actorId],
    queryFn: () => sdk.identity.getActor(actorId!),
    enabled: Boolean(actorId) && !isSelf,
  });

  if (!actorId) return undefined;
  if (isSelf) return "You";
  return data?.display_name ?? actorId;
}
