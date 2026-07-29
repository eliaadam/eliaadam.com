import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { userApi } from "../../lib/maicore";

export default function InvitationsSection() {
  return (
    <div className="p-8 max-w-[800px]">
      <h1 className="text-2xl font-bold text-black dark:text-white mb-1">
        Invitations
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
        Redeem invitations you've received or invite others to your containers.
      </p>

      <RedeemSection />
      <div className="my-8 border-t border-neutral-200 dark:border-neutral-800" />
      <CreateInvitationSection />
    </div>
  );
}

function RedeemSection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  const redeemMutation = useMutation({
    mutationFn: () => userApi.redeemInvitation(token, actor!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "memberships"] });
      setToken("");
    },
  });

  const result = redeemMutation.data as any;

  return (
    <div>
      <h2 className="text-base font-semibold text-black dark:text-white mb-3">
        Redeem an Invitation
      </h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        Paste the invitation token you received.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste invitation token…"
          className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors font-mono"
        />
        <button
          onClick={() => redeemMutation.mutate()}
          disabled={!token.trim() || redeemMutation.isPending}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {redeemMutation.isPending ? "Redeeming…" : "Redeem"}
        </button>
      </div>

      {redeemMutation.isError && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white font-medium">
          {(redeemMutation.error as Error).message}
        </div>
      )}

      {result && (
        <div className="px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-sm">
          <p className="font-semibold text-black dark:text-white m-0 mb-1">
            Joined successfully!
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
            Container: {result.container_id} · Status: {result.status}
          </p>
        </div>
      )}
    </div>
  );
}

function CreateInvitationSection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<{
    id: string;
    display_name: string;
    code: string;
  } | null>(null);
  const [actorSearch, setActorSearch] = useState("");
  const [selectedActor, setSelectedActor] = useState<{
    id: string;
    display_name: string;
    code: string;
  } | null>(null);
  const [expiresAt, setExpiresAt] = useState("");

  // Sent invitations with tokens (for copying)
  const [sentInvitations, setSentInvitations] = useState<
    Array<{ id: string; invitee: string; container: string; token: string }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // My containers
  const membershipsQuery = useQuery({
    queryKey: ["user", "memberships"],
    queryFn: () => userApi.myMemberships(actor!.id),
    enabled: !!actor,
  });

  const activeContainerIds = (
    (membershipsQuery.data ?? []) as Array<{
      container_id: string;
      status: string;
    }>
  )
    .filter((m) => m.status === "active")
    .map((m) => m.container_id);

  const containersQuery = useQuery({
    queryKey: ["user", "myContainerDetails", activeContainerIds],
    queryFn: async () => {
      const results = [];
      for (const id of activeContainerIds) {
        try {
          results.push(await userApi.getContainer(id));
        } catch {
          /* skip */
        }
      }
      return results;
    },
    enabled: activeContainerIds.length > 0,
  });

  const myContainers = (containersQuery.data ?? []) as Array<{
    id: string;
    display_name: string;
    code: string;
  }>;

  // Actor search — uses the new authenticated Ember endpoint
  const actorSearchQuery = useQuery({
    queryKey: ["user", "actorSearch", actorSearch],
    queryFn: () => userApi.searchActors(actorSearch || undefined),
    enabled: actorSearch.length >= 1,
  });

  const foundActors = (
    (actorSearchQuery.data ?? []) as Array<{
      id: string;
      display_name: string;
      code: string;
      status: string;
    }>
  ).filter((a) => a.id !== actor?.id);

  const createMutation = useMutation({
    mutationFn: () =>
      userApi.createInvitation(
        selectedContainer!.id,
        selectedActor!.id,
        expiresAt || undefined,
        selectedRoles.length > 0 ? selectedRoles : undefined,
      ),
    onSuccess: (data: any) => {
      // Store the token so user can copy it
      if (data?.token) {
        setSentInvitations((prev) => [
          {
            id: data.id,
            invitee: selectedActor!.display_name,
            container: selectedContainer!.display_name,
            token: data.token,
          },
          ...prev,
        ]);
      }
      setSelectedActor(null);
      setActorSearch("");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const copyToken = async (id: string, token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      prompt("Copy this token:", token);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div>
      <h2 className="text-base font-semibold text-black dark:text-white mb-3">
        Invite Someone
      </h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        Invite a user to one of your containers. You'll get a token to share
        with them.
      </p>

      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Container picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Your Container *
          </label>
          {selectedContainer ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex-1">
                {selectedContainer.display_name}
                <span className="text-xs font-mono text-neutral-500 ml-2">
                  {selectedContainer.code}
                </span>
              </span>
              <button
                onClick={() => setSelectedContainer(null)}
                className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {myContainers.length === 0 && !containersQuery.isLoading && (
                <p className="text-xs text-neutral-400 m-0">
                  No active container memberships.
                </p>
              )}
              {containersQuery.isLoading && (
                <p className="text-xs text-neutral-400 m-0">
                  Loading your containers…
                </p>
              )}
              {myContainers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContainer(c)}
                  className="text-left px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
                >
                  <span className="text-black dark:text-white font-medium">
                    {c.display_name}
                  </span>
                  <span className="text-xs font-mono text-neutral-500 ml-2">
                    {c.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actor picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Invite Who? *
          </label>
          {selectedActor ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex-1">
                {selectedActor.display_name}
                <span className="text-xs font-mono text-neutral-500 ml-2">
                  {selectedActor.code}
                </span>
              </span>
              <button
                onClick={() => setSelectedActor(null)}
                className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={actorSearch}
                onChange={(e) => setActorSearch(e.target.value)}
                placeholder="Search by name or email…"
                className={inputCls}
              />
              {actorSearch && foundActors.length > 0 && (
                <div className="mt-1 max-h-[200px] overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  {foundActors.slice(0, 10).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedActor(a);
                        setActorSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition border-b border-neutral-100 dark:border-neutral-900 last:border-b-0"
                    >
                      <span className="text-black dark:text-white font-medium">
                        {a.display_name}
                      </span>
                      <span className="text-xs font-mono text-neutral-500 ml-2">
                        {a.code ?? ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {actorSearch &&
                actorSearch.length >= 1 &&
                foundActors.length === 0 &&
                !actorSearchQuery.isLoading && (
                  <p className="text-xs text-neutral-400 mt-1 m-0">
                    No actors found.
                  </p>
                )}
            </div>
          )}
        </div>

        {/* Expiry */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Expires At (optional)
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Assign Roles (optional)
            </label>
            <RolePicker
              containerId={selectedContainer?.id ?? null}
              selectedRoles={selectedRoles}
              onChange={setSelectedRoles}
            />
          </div>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <button
        onClick={() => createMutation.mutate()}
        disabled={
          !selectedContainer || !selectedActor || createMutation.isPending
        }
        className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        {createMutation.isPending ? "Sending…" : "Send Invitation"}
      </button>

      {createMutation.isError && (
        <div className="mt-4 px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white font-medium">
          {(createMutation.error as Error).message}
        </div>
      )}

      {/* Sent invitations with copy-able tokens */}
      {sentInvitations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
            Sent Invitations
          </h3>
          <div className="flex flex-col gap-2">
            {sentInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-black dark:text-white m-0">
                      <span className="font-medium">{inv.invitee}</span>
                      <span className="text-neutral-500 mx-1">→</span>
                      <span className="font-medium">{inv.container}</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                      ID: {inv.id}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToken(inv.id, inv.token)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                      copiedId === inv.id
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white"
                    }`}
                  >
                    {copiedId === inv.id ? "Copied!" : "Copy Token"}
                  </button>
                </div>
                <div className="bg-white dark:bg-black rounded px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400 break-all select-all">
                  {inv.token}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function RolePicker({
  containerId,
  selectedRoles,
  onChange,
}: {
  containerId: string | null;
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}) {
  // Fetch available roles from authority
  const rolesQuery = useQuery({
    queryKey: ["user", "availableRoles"],
    queryFn: async () => {
      const token = localStorage.getItem("maicore_token");
      const res = await fetch(
        `${import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000"}/api/authority/roles`,
        {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        display_name: string;
      }>;
    },
    enabled: !!containerId,
  });

  const roles = rolesQuery.data ?? [];

  // Filter to roles scoped to this container (code starts with container code)
  // or show all roles if we can't determine the scope
  const toggle = (code: string) => {
    if (selectedRoles.includes(code)) {
      onChange(selectedRoles.filter((r) => r !== code));
    } else {
      onChange([...selectedRoles, code]);
    }
  };

  if (!containerId)
    return (
      <p className="text-xs text-neutral-400 m-0">Select a container first.</p>
    );
  if (roles.length === 0)
    return <p className="text-xs text-neutral-400 m-0">No roles available.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <button
          key={role.code}
          type="button"
          onClick={() => toggle(role.code)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
            selectedRoles.includes(role.code)
              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
              : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-black dark:hover:border-white"
          }`}
        >
          {role.display_name ?? role.name}
        </button>
      ))}
    </div>
  );
}
