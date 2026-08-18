import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/hierarchy${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}

/**
 * Container login credentials — OWNER ONLY.
 *
 * A container is itself an actor. Setting an email + password here makes the
 * container loginable: anyone with these credentials can sign in AS the
 * container (shared-login model) through the normal login page. Only the owner
 * manages them. The backend enforces the owner check too; this section is shown
 * only to owners.
 */
export default function ContainerCredentialsSection({
  containerId,
}: {
  containerId: string;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rotatePw, setRotatePw] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const status = useQuery({
    queryKey: ["container-login", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/login`),
  });
  const hasLogin: boolean = !!status.data?.has_login;

  const setLogin = useMutation({
    mutationFn: () =>
      api("PUT", `/containers/${containerId}/login`, {
        email: email.trim(),
        password,
      }),
    onSuccess: () => {
      setPassword("");
      setMsg({
        kind: "ok",
        text: "Container login saved. The container can now sign in with this email and password.",
      });
      qc.invalidateQueries({ queryKey: ["container-login", containerId] });
    },
    onError: (e: any) =>
      setMsg({ kind: "err", text: e.message ?? "Failed to save login." }),
  });

  const rotate = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/login/rotate`, {
        password: rotatePw,
      }),
    onSuccess: () => {
      setRotatePw("");
      setMsg({ kind: "ok", text: "Password rotated." });
    },
    onError: (e: any) =>
      setMsg({ kind: "err", text: e.message ?? "Failed to rotate password." }),
  });

  const revoke = useMutation({
    mutationFn: () => api("DELETE", `/containers/${containerId}/login`),
    onSuccess: () => {
      setMsg({ kind: "ok", text: "Container login disabled." });
      qc.invalidateQueries({ queryKey: ["container-login", containerId] });
    },
    onError: (e: any) =>
      setMsg({ kind: "err", text: e.message ?? "Failed to disable login." }),
  });

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-black dark:text-white">
          Container Login
        </h3>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${
            hasLogin
              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {status.isLoading ? "…" : hasLogin ? "Login enabled" : "No login"}
        </span>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        Give this container its own email and password so it can sign in as
        itself. Anyone with these credentials can act as the container, so share
        them carefully. Only you (the owner) can change them.
      </p>

      {msg && (
        <div
          className={`text-xs px-3 py-2 rounded-md mb-4 ${
            msg.kind === "ok"
              ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Set / reset login */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {hasLogin ? "Update email & password" : "Set email & password"}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="container@example.com"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 characters)"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <button
          onClick={() => setLogin.mutate()}
          disabled={!email.trim() || password.length < 8 || setLogin.isPending}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {hasLogin ? "Update login" : "Enable login"}
        </button>
      </div>

      {/* Rotate + revoke — only when a login exists */}
      {hasLogin && (
        <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Rotate password only
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={rotatePw}
                onChange={(e) => setRotatePw(e.target.value)}
                placeholder="New password"
                className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <button
                onClick={() => rotate.mutate()}
                disabled={rotatePw.length < 8 || rotate.isPending}
                className="px-3 py-2 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40"
              >
                Rotate
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Disable container login? The container will no longer be able to sign in until you set a new login.",
                  )
                ) {
                  revoke.mutate();
                }
              }}
              disabled={revoke.isPending}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
            >
              Disable container login
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
