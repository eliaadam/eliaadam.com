import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { ApiError } from "../../../lib/query/Api";
import { sdk } from "../../../lib/sdk";
import type { CarrierProfile } from "../../../lib/sdk/domains/logistics";

/**
 * Manages this container's OWN carrier-discovery profiles — a
 * container may now run several independent service lines (land
 * freight, air freight, ...), each its own CarrierProfile, created,
 * edited, and deactivated independently. An earlier version of this
 * domain enforced exactly one per container; that constraint has
 * been dropped entirely (see the backend's own CarrierProfileState
 * module docstring).
 *
 * display_name/avatar_url give a profile a real identity in the
 * public browse — before this, a carrier card showed only what it
 * does (transport_modes/description), not who it is.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const TRANSPORT_MODE_OPTIONS = ["land", "sea", "air"];

export function CarrierAvatar({
  displayName,
  avatarUrl,
  size = 36,
}: {
  displayName: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{ width: size, height: size }}
        className="flex-none rounded-full object-cover"
      />
    );
  }
  // displayName is typed as required string on CarrierProfile, but
  // that's a compile-time promise only — a legacy profile (backfilled
  // with "" by migration 0005, not undefined) or a genuinely
  // malformed response can still hand this undefined/null/"" at
  // runtime, and this component must not crash the whole page over
  // one missing field.
  const initial = (displayName ?? "").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
    >
      {initial || <Truck size={14} />}
    </div>
  );
}

export function CarrierProfileTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["logistics", "carrier-profiles", containerId],
    queryFn: () => sdk.logistics.listCarrierProfilesForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Carrier profiles</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Each profile is an independent listing in the public carrier browse
            — one per service line, if you run more than one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex flex-none items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New profile"}
        </button>
      </div>

      {showCreate && (
        <CreateProfileForm
          containerId={containerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {profiles && profiles.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            No carrier profiles yet — create one to appear in the public carrier
            browse.
          </p>
        </div>
      )}

      {profiles && profiles.length > 0 && (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: CarrierProfile }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "carrier-profiles"],
    });

  const deactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.deactivateCarrierProfile(profile.id),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.reactivateCarrierProfile(profile.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <EditProfileForm profile={profile} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CarrierAvatar
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {profile.display_name}
            </p>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                profile.status === "active"
                  ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              {profile.status}
            </span>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
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
    </li>
  );
}

function CreateProfileForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [transportMode, setTransportMode] = useState("land");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createCarrierProfile(containerId, {
        display_name: displayName,
        transport_modes: [transportMode],
        description,
        avatar_url: avatarUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "carrier-profiles"],
      });
      onDone();
    },
  });

  const notLicensed =
    mutation.isError &&
    mutation.error instanceof ApiError &&
    mutation.error.status === 409;

  const canSubmit = Boolean(displayName.trim() && description.trim());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Display name
        </label>
        <input
          className={inputClass}
          placeholder="How this profile appears in the browse…"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Avatar URL (optional)
        </label>
        <input
          className={inputClass}
          placeholder="https://…"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Mode
        </label>
        <select
          className={inputClass}
          value={transportMode}
          onChange={(e) => setTransportMode(e.target.value)}
        >
          {TRANSPORT_MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create profile"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
      {notLicensed && (
        <p className="text-xs text-red-600 dark:text-red-400">
          This container doesn't have Logistics licensed yet — that's required
          before a carrier profile can be created.
        </p>
      )}
      {mutation.isError && !notLicensed && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't create the carrier profile.
        </p>
      )}
    </div>
  );
}

function EditProfileForm({
  profile,
  onDone,
}: {
  profile: CarrierProfile;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [description, setDescription] = useState(profile.description);

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.updateCarrierProfile(profile.id, {
        display_name: displayName,
        description,
        avatar_url: avatarUrl || undefined,
        transport_modes: profile.transport_modes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "carrier-profiles"],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Display name
        </label>
        <input
          className={inputClass}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Avatar URL
        </label>
        <input
          className={inputClass}
          placeholder="https://…"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </div>
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
          disabled={
            !displayName.trim() || !description.trim() || mutation.isPending
          }
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
