import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, X } from "lucide-react";
import { sdk } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { useAuth } from "../../components/context/Authcontext";
import { Avatar } from "../../components/Avatar";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Fetches the real, current Actor via `getActor()` rather than
 * trusting whatever `useAuth()`'s `user` object carries — that's set
 * once at login/signup and predates `name`/`avatar_file_id` (both
 * added later this session), so it's not a reliable source for either.
 */
export function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: actor } = useQuery({
    queryKey: ["identity", "actor", user?.id],
    queryFn: () => sdk.identity.getActor(user!.id),
    enabled: Boolean(user),
  });

  const { data: avatarData } = useQuery({
    queryKey: ["identity", "my-avatar-url"],
    queryFn: () => sdk.avatars.getMyAvatarUrl(),
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (actor && !initialized) {
    setDisplayName(actor.display_name);
    setUsername(actor.name ?? "");
    setInitialized(true);
  }

  const invalidateActor = () =>
    queryClient.invalidateQueries({
      queryKey: ["identity", "actor", user?.id],
    });

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.identity.updateMyProfile({
        display_name: displayName,
        name: username || undefined,
      }),
    onSuccess: () => {
      setNameError(null);
      setSaved(true);
      invalidateActor();
    },
    onError: (err: unknown) => {
      setSaved(false);
      if (err instanceof ApiError && err.status === 409) {
        setNameError("That username is already taken.");
      }
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => sdk.avatars.setMyAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["identity", "my-avatar-url"],
      });
      invalidateActor();
    },
  });

  const avatarClearMutation = useMutation({
    mutationFn: () => sdk.avatars.clearMyAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["identity", "my-avatar-url"],
      });
      invalidateActor();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) avatarUploadMutation.mutate(file);
    event.target.value = "";
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Your account details.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          <Avatar
            src={avatarData?.avatar_url}
            name={actor?.display_name ?? user?.name ?? "?"}
            size="lg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploadMutation.isPending}
            aria-label="Change avatar"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            <Camera size={12} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {avatarUploadMutation.isPending ? "Uploading…" : "Profile picture"}
          </p>
          {avatarData?.avatar_url && (
            <button
              type="button"
              onClick={() => avatarClearMutation.mutate()}
              disabled={avatarClearMutation.isPending}
              className="flex w-fit items-center gap-1 text-xs font-medium text-neutral-500 hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
            >
              <X size={12} />
              Remove
            </button>
          )}
          {avatarUploadMutation.isError && (
            <p className="max-w-[16rem] text-xs text-red-600 dark:text-red-400">
              {avatarUploadMutation.error instanceof ApiError
                ? avatarUploadMutation.error.message
                : "Couldn't upload that image."}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display_name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="e.g. jsmith"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setSaved(false);
              setNameError(null);
            }}
            className={inputClass}
          />
          {nameError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {nameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.email ?? ""}
            disabled
            className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Your canonical identifier — changing this is a separate,
            not-yet-built account-security flow.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
