import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { sdk, type Container } from "../../lib/sdk";
import { useAuth } from "./Authcontext";

interface ContainerContextValue {
  currentContainerId: string | null;
  currentContainer: Container | null;
  containers: Container[];
  isLoading: boolean;
  switchContainer: (containerId: string) => void;
  refresh: () => void;
}

const STORAGE_KEY = "maicore.container.current";
const ContainerContext = createContext<ContainerContextValue | null>(null);

// Where a container switch lands the user — deliberately a
// container-agnostic route, not wherever they happened to be. Staying
// on e.g. /dashboard/payment across a switch is exactly the bug this
// fixes: the new container might not even have that capability
// licensed, and even when it does, that page's own React Query keys
// catching up (or not) shouldn't be what determines what the user
// sees immediately after switching.
const SAFE_LANDING_ROUTE = "/dashboard";

function loadStoredContainerId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function persistContainerId(containerId: string): void {
  localStorage.setItem(STORAGE_KEY, containerId);
}

export function ContainerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [containers, setContainers] = useState<Container[]>([]);
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setContainers([]);
      setCurrentContainerId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    sdk.container
      .listActorMemberships(user.id)
      .then(async (memberships) => {
        const active = memberships.filter((m) => m.status === "active");
        const resolved = await Promise.all(
          active.map((m) => sdk.container.getContainer(m.container_id)),
        );
        if (cancelled) return;

        setContainers(resolved);

        const stored = loadStoredContainerId();
        const storedStillValid = resolved.some((c) => c.id === stored);
        const next = storedStillValid ? stored : (resolved[0]?.id ?? null);

        // Deliberately NOT navigating here — this branch runs on
        // initial load (and on refresh()), not on a user-initiated
        // switch. Redirecting here would yank a freshly-logged-in
        // user away from wherever they landed (a deep link, a
        // bookmark) the moment their container resolves. Only
        // switchContainer() below — the one function actually wired
        // to the switcher UI — should ever navigate.
        setCurrentContainerId(next);
        if (next) persistContainerId(next);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const switchContainer = (containerId: string) => {
    setCurrentContainerId(containerId);
    persistContainerId(containerId);
    // FIX: this function used to only update state — nothing told
    // React Router the context changed, so whatever page the user was
    // on (e.g. /dashboard/payment) just stayed mounted, showing
    // either stale data or a broken view if the new container doesn't
    // even have that capability licensed. Every capability-specific
    // page gets unmounted by this navigation; if the user goes back
    // to it, it mounts fresh against the new currentContainerId.
    navigate(SAFE_LANDING_ROUTE);
  };

  const currentContainer =
    containers.find((c) => c.id === currentContainerId) ?? null;

  return (
    <ContainerContext.Provider
      value={{
        currentContainerId,
        currentContainer,
        containers,
        isLoading,
        switchContainer,
        refresh: () => setRefreshToken((n) => n + 1),
      }}
    >
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): ContainerContextValue {
  const context = useContext(ContainerContext);
  if (!context) {
    throw new Error("useContainer must be used within ContainerProvider");
  }
  return context;
}
