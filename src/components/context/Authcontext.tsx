import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../../lib/query/Api";
import { sdk, type Actor } from "../../lib/sdk";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../../lib/other/authToken";

/**
 * Owns the session: calls sdk.identity, persists the token + a small
 * user cache, and exposes { user, isLoading, signIn, signUp, signOut }
 * to the rest of the app.
 *
 * One wrinkle: the actor payload the API returns (id, actor_type,
 * display_name, code, status) has no email field, so email is cached
 * locally from whatever the person typed at sign-in/sign-up and
 * carried forward across refreshes rather than re-fetched.
 */

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const USER_CACHE_KEY = "maicore.auth.user";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadCachedUser(): User | null {
  const raw = localStorage.getItem(USER_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistUser(user: User): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function clearPersistedUser(): void {
  localStorage.removeItem(USER_CACHE_KEY);
}

function toUser(actor: Actor, email: string): User {
  return {
    id: actor.id,
    name: actor.display_name,
    email,
    status: actor.status,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadCachedUser);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, re-validate any stored token against the server instead of
  // trusting the cached user forever — a token can be revoked/expired
  // server-side (logout elsewhere, admin action, etc.).
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    sdk.identity
      .me()
      .then(({ actor }) => {
        const cached = loadCachedUser();
        const next = toUser(actor, cached?.email ?? "");
        persistUser(next);
        setUser(next);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthToken();
          clearPersistedUser();
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const { actor, access_token } = await sdk.identity.login({
      email,
      password,
    });
    setAuthToken(access_token);
    const next = toUser(actor, email);
    persistUser(next);
    setUser(next);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { actor, access_token } = await sdk.identity.register({
      email,
      password,
      display_name: name,
    });
    setAuthToken(access_token);
    const next = toUser(actor, email);
    persistUser(next);
    setUser(next);
  };

  const signOut = async () => {
    try {
      await sdk.identity.logout();
    } catch {
      // Token may already be invalid/expired server-side — clear the
      // local session regardless so the person is signed out either way.
    } finally {
      clearAuthToken();
      clearPersistedUser();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
