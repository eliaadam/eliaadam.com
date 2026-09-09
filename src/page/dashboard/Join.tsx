import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../../lib/query/Api";
import { sdk } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Direct self-serve join — only works if the container's own policy
 * has `allow_public_join: true` (see `sdk.container.joinContainer`'s
 * own docstring). There's no "discover containers" browse UI yet (no
 * list/search endpoint exists on the backend — see the Phase 2 note
 * from planning this feature), so for now this expects the person to
 * already know the container's slug, e.g. from a link shared outside
 * the app. Use Invitations instead for containers that require one.
 */
export function Join() {
  const { user } = useAuth();
  const { refresh } = useContainer();
  const [slug, setSlug] = useState("");
  const [role, setRole] = useState("member");

  const lookupMutation = useMutation({
    mutationFn: () => sdk.container.getContainerBySlug(slug),
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      sdk.container.joinContainer({
        container_id: lookupMutation.data!.id,
        actor_id: user!.id,
        role,
      }),
    onSuccess: refresh,
  });

  const handleLookup = (event: FormEvent) => {
    event.preventDefault();
    lookupMutation.mutate();
  };

  const joinErrorMessage =
    joinMutation.error instanceof ApiError
      ? joinMutation.error.status === 409
        ? "This container doesn't allow public join — ask its owner for an invitation instead."
        : joinMutation.error.message
      : null;

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight">Join a container</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Works only for containers whose policy allows public join — otherwise
        ask for an invitation.
      </p>

      <form onSubmit={handleLookup} className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Container slug
          </label>
          <input
            id="slug"
            className={inputClass}
            required
            placeholder="mai-shop"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              lookupMutation.reset();
              joinMutation.reset();
            }}
          />
        </div>
        <button
          type="submit"
          disabled={lookupMutation.isPending}
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {lookupMutation.isPending ? "Looking up…" : "Find"}
        </button>
        {lookupMutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            No container found with that slug.
          </p>
        )}
      </form>

      {lookupMutation.data && (
        <div className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm font-medium">
            {lookupMutation.data.display_name}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            {lookupMutation.data.slug} · {lookupMutation.data.visibility}
          </p>

          <div className="mt-3 flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor="role"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-500"
              >
                Join as role
              </label>
              <input
                id="role"
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {joinMutation.isPending ? "Joining…" : "Join"}
            </button>
          </div>

          {joinMutation.isSuccess && (
            <p className="mt-3 text-sm text-black dark:text-white">
              Joined — switch to it from the sidebar.
            </p>
          )}
          {joinErrorMessage && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {joinErrorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
