import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";

/**
 * Debounced actor search, scoped to a container.
 *
 * The three call sites that used to do this inline (new-direct form,
 * new-group form, add-participant panel) all searched with
 * `containerId: ""`, which meant every "add people" search ignored
 * the container entirely. This takes the real container id and
 * debounces keystrokes so we're not firing a request per character.
 */
export function useActorSearch(containerId: string | undefined, rawSearch: string) {
  const [search, setSearch] = useState(rawSearch);

  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  const trimmed = search.trim();

  return useQuery({
    queryKey: ["actors", "search", containerId, trimmed],
    queryFn: () =>
      sdk.identity.listActors({
        search: trimmed,
        limit: 10,
        containerId: containerId!,
      }),
    enabled: Boolean(containerId) && trimmed.length > 1,
  });
}
