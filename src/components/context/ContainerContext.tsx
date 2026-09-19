// ContainerContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "./Authcontext";
import { sdk, type Container } from "../../lib/sdk";

const STORAGE_KEY = "sonicpesa.current-container-id";

type ContainerContextValue = {
  containers: Container[];
  currentContainerId: string | null;
  currentContainer: Container | null;
  switchContainer: (id: string) => void;
  isLoading: boolean;
};

const ContainerContext = createContext<ContainerContextValue | null>(null);

function readStoredContainerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

/**
 * Container has no "list containers for the current actor" endpoint —
 * only listActorMemberships(actorId), which returns Membership[]
 * (container_id, role, status — no container name/slug/etc). So this
 * resolves the actor's active memberships first, then fetches each
 * container's full record. If this becomes a hot path with many
 * memberships, ask the backend for a batch-get-by-ids endpoint rather
 * than growing this Promise.all further.
 */
async function fetchActorContainers(actorId: string): Promise<Container[]> {
  const memberships = await sdk.container.listActorMemberships(actorId);
  const active = memberships.filter((m) => m.status === "active");

  const containers = await Promise.all(
    active.map((m) => sdk.container.getContainer(m.container_id)),
  );

  return containers;
}

export function ContainerProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // NOTE: assumes `user.id` is the actor id — that's the one field this
  // file needs from Authcontext that ProfileMenu doesn't already prove
  // exists (it only reads user.name / user.email). Point this at the
  // right field if the auth user shape differs.
  const actorId = user?.id ?? null;

  const { data: containers = [], isLoading } = useQuery({
    queryKey: ["containers", actorId],
    queryFn: () => fetchActorContainers(actorId as string),
    enabled: Boolean(actorId),
  });

  const [currentContainerId, setCurrentContainerId] = useState<string | null>(
    readStoredContainerId,
  );

  // Derived, not effect-driven: if the stored id doesn't match anything
  // we actually belong to (revoked access, stale localStorage, nothing
  // picked yet), fall back to the first container once the list is in.
  const effectiveContainerId =
    !isLoading && !containers.some((c) => c.id === currentContainerId)
      ? (containers[0]?.id ?? null)
      : currentContainerId;

  const currentContainer = useMemo(
    () => containers.find((c) => c.id === effectiveContainerId) ?? null,
    [containers, effectiveContainerId],
  );

  function switchContainer(id: string) {
    if (id === effectiveContainerId) return;

    setCurrentContainerId(id);
    window.localStorage.setItem(STORAGE_KEY, id);

    // Land somewhere guaranteed valid in the new container's context,
    // rather than leaving the actor on a route/resource scoped to the
    // previous container.
    navigate("/dashboard");
  }

  const value: ContainerContextValue = {
    containers,
    currentContainerId: effectiveContainerId,
    currentContainer,
    switchContainer,
    isLoading,
  };

  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  );
}

// This hook must remain colocated for the current public API. The context
// module also exports the provider, so exclude this non-component export from
// the fast-refresh rule until hooks are split into a separate module.
// eslint-disable-next-line react-refresh/only-export-components
export function useContainer() {
  const ctx = useContext(ContainerContext);

  if (!ctx) {
    throw new Error("useContainer must be used within a ContainerProvider");
  }

  return ctx;
}
