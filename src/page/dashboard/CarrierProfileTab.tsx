import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/query/Api";
import { sdk } from "../../lib/sdk";

/**
 * Manages this container's OWN public carrier-discovery profile — a
 * one-per-container singleton (see the backend's own
 * CarrierProfileState module docstring). Creating one requires
 * core.logistics to actually be licensed on this container; a 409
 * here most likely means it isn't — surfaced directly rather than as
 * a generic failure, since it's the single most likely cause.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const TRANSPORT_MODE_OPTIONS = ["land"];

export function CarrierProfileTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState(false);

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["logistics", "carrier-profile", containerId],
    queryFn: () => sdk.logistics.getCarrierProfileForContainer(containerId),
    retry: false,
  });

  const notFound = error instanceof ApiError && error.status === 404;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "carrier-profile", containerId],
    });

  const createMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createCarrierProfile(containerId, {
        transport_modes: ["land"],
        description,
      }),
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.deactivateCarrierProfile(containerId),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.reactivateCarrierProfile(containerId),
    onSuccess: invalidate,
  });

  const notLicensed =
    createMutation.isError &&
    createMutation.error instanceof ApiError &&
    createMutation.error.status === 409;

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <div>
          <p className="text-sm font-medium">No carrier profile yet</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            Creating one makes this container discoverable in the public carrier
            browse.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Description
          </label>
          <textarea
            className={`${inputClass} min-h-[5rem]`}
            placeholder="What do you deliver, and where?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!description.trim() || createMutation.isPending}
          className={`self-start ${primaryButtonClass}`}
        >
          {createMutation.isPending ? "Creating…" : "Create profile"}
        </button>
        {notLicensed && (
          <p className="text-xs text-red-600 dark:text-red-400">
            This container doesn't have Logistics licensed yet — that's required
            before a carrier profile can be created.
          </p>
        )}
        {createMutation.isError && !notLicensed && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't create the carrier profile.
          </p>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <EditCarrierProfileForm
        containerId={containerId}
        description={profile.description}
        transportModes={profile.transport_modes}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            profile.status === "active"
              ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          }`}
        >
          {profile.status}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Edit
          </button>
          {profile.status === "active" ? (
            <button
              type="button"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className={primaryButtonClass}
            >
              Reactivate
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        {profile.description}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        {profile.transport_modes.join(", ")}
      </p>
    </div>
  );
}

function EditCarrierProfileForm({
  containerId,
  description: initialDescription,
  transportModes: initialModes,
  onDone,
}: {
  containerId: string;
  description: string;
  transportModes: string[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(initialDescription);

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.updateCarrierProfile(containerId, {
        description,
        transport_modes: initialModes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "carrier-profile", containerId],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <textarea
          className={`${inputClass} min-h-[5rem]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!description.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't save changes.
          </p>
        )}
      </div>
    </div>
  );
}
