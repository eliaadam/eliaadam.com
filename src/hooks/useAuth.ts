import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { maicore, setAuthToken, clearToken } from "../lib/maicore";
import {
  queryKeys,
  fetchSession,
  checkIsAdmin,
  persistActor,
  clearActor,
} from "../lib/queries";
import type { Actor, LoginRequest, MaicoreValidationError } from "../lib/maicore-sdk";


export interface AuthState {
  actor: Actor | null | undefined;
  isAdmin: boolean;
  isAdminLoading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  loginFieldErrors: Record<string, string[]> | null;
  isLoggingIn: boolean;
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem("maicore_token"),
  });

  const adminQuery = useQuery({
    queryKey: queryKeys.isAdmin,
    queryFn: checkIsAdmin,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!sessionQuery.data,
  });

  const loginMutation = useMutation({
    mutationFn: async (params: LoginRequest) => {
      const result = await maicore.identity.auth.login(params);

      if (!result.authenticated || !result.token?.token || !result.actor) {
        throw new Error(result.message || "Authentication failed.");
      }

      setAuthToken(result.token.token);

      const actor: Actor = {
        id: result.actor.id,
        code: result.actor.code,
        display_name: result.actor.display_name,
        status: result.actor.status,
        actor_type_id: "",
        metadata: {},
      };
      persistActor(actor);

      return { ...result, actorEntity: actor };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.session, result.actorEntity);
      queryClient.invalidateQueries({ queryKey: queryKeys.isAdmin });
      navigate("/home", { replace: true });
    },
  });

  const logout = useCallback(async () => {
    try {
      await maicore.identity.auth.logout();
    } catch {
      // ignore
    } finally {
      clearToken();
      clearActor();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }, [queryClient, navigate]);

  let loginError: string | null = null;
  let loginFieldErrors: Record<string, string[]> | null = null;

  if (loginMutation.error) {
    const err = loginMutation.error;
    if (
      typeof err === "object" &&
      err !== null &&
      "errors" in err &&
      typeof (err as MaicoreValidationError).errors === "object"
    ) {
      loginFieldErrors = (err as MaicoreValidationError).errors;
      loginError = (err as MaicoreValidationError).message;
    } else {
      loginError = err instanceof Error ? err.message : "Login failed.";
    }
  }

  const hasToken = !!localStorage.getItem("maicore_token");
  const isLoading = hasToken && sessionQuery.isLoading;
  const isAuthenticated = !!sessionQuery.data;

  return {
    actor: sessionQuery.data ?? (hasToken ? null : undefined),
    isAdmin: adminQuery.data ?? false,
    isAdminLoading: adminQuery.isLoading && !!sessionQuery.data,
    isLoading,
    isAuthenticated,
    login: async (params) => {
      await loginMutation.mutateAsync(params);
    },
    logout,
    loginError,
    loginFieldErrors,
    isLoggingIn: loginMutation.isPending,
  };
}