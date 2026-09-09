import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Search } from "lucide-react";
import {
  sdk,
  type Actor,
  type CapabilityManifest,
  type Invitation,
} from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Guided invitation creation — no raw ids. Pick a container you
 * belong to, search for a user, pick a role that's actually
 * assignable there, set an optional expiry, create, copy the code.
 *
 * STRICT BY DESIGN: `invitee_actor_id` is required — an invitation
 * always names exactly one intended recipient, enforced server-side
 * too (`InvitationService.redeem()` rejects a mismatched actor with a
 * 403 — this isn't just UI politeness).
 *
 * The role picker's options are the SAME "member" + licensed
 * capability roles source `ContainerMembers.tsx` uses — picking one
 * populates `assigned_role_codes`, which is what actually grants a
 * real Authority role on redemption (wired at
 * `domains/container/interface/dependencies.py::_grant_authority_roles`).
 *
 * "Containers you can invite for" = containers you're a MEMBER of.
 * The backend's own `can_invite_actor` rule only checks the
 * container's policy (`allow_invitations`), not who's asking — there's
 * no real ownership enforcement anywhere in this codebase yet, so this
 * picker is a practical default, not a security boundary.
 */
export function Invitations() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Invitations</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Invite a specific person to a specific container, with a real role. Only
        they can redeem it.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <CreateInvitationForm actorId={user!.id} />
        <RedeemInvitationForm actorId={user!.id} />
      </div>
    </div>
  );
}

function CreateInvitationForm({ actorId }: { actorId: string }) {
  const { containers } = useContainer();

  const [containerId, setContainerId] = useState("");
  const [search, setSearch] = useState("");
  const [invitee, setInvitee] = useState<Actor | null>(null);
  const [roleCode, setRoleCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [created, setCreated] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const actorsQuery = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () =>
      sdk.identity.listActors({
        search,
        limit: 10,
        containerId: "",
      }),
    enabled: search.trim().length > 1,
  });

  const manifestsQuery = useQuery({
    queryKey: ["capability", "manifests", containerId],
    queryFn: () => sdk.capability.listManifests(containerId),
    enabled: Boolean(containerId),
  });

  // "container-owner" is a real, base seeded Authority role (spec
  // §9.2's auto-grant target — see
  // `AUTHORITY_CONTAINER_OWNER_ROLE_CODE`), included here alongside
  // "member" as an always-available option so ownership can be
  // GRANTED to someone through the same picker as any other role, not
  // just auto-assigned at container creation.
  const availableRoles: { code: string; label: string }[] = [
    { code: "member", label: "Member" },
    { code: "container-owner", label: "Container Owner" },
    ...((manifestsQuery.data ?? []) as CapabilityManifest[])
      .filter((m) => m.licensed)
      .flatMap((m) => m.roles.map((r) => ({ code: r.code, label: r.label }))),
  ];

  const mutation = useMutation({
    mutationFn: () =>
      sdk.container.createInvitation({
        container_id: containerId,
        invited_by_actor_id: actorId,
        invitee_actor_id: invitee!.id,
        role: "member",
        type: "actor",
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        assigned_role_codes: roleCode ? [roleCode] : undefined,
      }),
    onSuccess: (invitation) => setCreated(invitation),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const copyCode = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">
        Create an invitation
      </h2>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Container
          </label>
          <select
            className={inputClass}
            required
            value={containerId}
            onChange={(e) => {
              setContainerId(e.target.value);
              setRoleCode("");
            }}
          >
            <option value="">Choose a container…</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Invitee <span className="text-red-500">*</span>
          </label>
          {invitee ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-neutral-100/50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
              <span>{invitee.display_name}</span>
              <button
                type="button"
                onClick={() => {
                  setInvitee(null);
                  setSearch("");
                }}
                className="text-xs text-neutral-500 hover:underline dark:text-neutral-500"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                className={`${inputClass} w-full pl-8`}
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {actorsQuery.data && actorsQuery.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                  {actorsQuery.data.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setInvitee(a);
                          setSearch("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        {a.display_name}
                        {a.code && (
                          <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-500">
                            {a.code}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Role to grant
          </label>
          <select
            className={inputClass}
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            disabled={!containerId}
          >
            <option value="">No role (membership only)</option>
            {availableRoles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Expires (optional)
          </label>
          <input
            type="datetime-local"
            className={inputClass}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={!containerId || !invitee || mutation.isPending}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Creating…" : "Create invitation"}
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't create an invitation — check that this container's policy
            allows invitations.
          </p>
        )}
      </form>

      {created && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-100/50 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
          <div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Share this code:
            </p>
            <p className="mt-1 font-mono text-sm font-medium">{created.code}</p>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 dark:text-white dark:hover:bg-neutral-900"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </section>
  );
}

function RedeemInvitationForm({ actorId }: { actorId: string }) {
  const { refresh } = useContainer();
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.container.redeemInvitation({ code, actor_id: actorId }),
    onSuccess: refresh,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 403
      ? "This invitation was issued for a different actor."
      : mutation.error
        ? "Couldn't redeem that code — check it's correct and not expired."
        : null;

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">
        Redeem an invitation
      </h2>
      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Code
          </label>
          <input
            className={inputClass}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Redeeming…" : "Redeem"}
        </button>
      </form>
      {mutation.isSuccess && (
        <p className="mt-2 text-sm text-black dark:text-white">
          Joined — switch to it from the sidebar.
        </p>
      )}
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
