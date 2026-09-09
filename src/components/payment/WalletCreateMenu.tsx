import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { sdk, type Actor } from "../../lib/sdk";
import { useAuth } from "../context/Authcontext";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Four wallet shapes, one menu. "Container + members" is only shown
 * if the backend actually confirms `core.payment.wallet.create_shared`
 * for this actor in this container — that permission is granted to no
 * capability role at all (see the manifest), reachable only via the
 * Gate's wildcard step for a real container owner, so showing this
 * option to everyone would mean showing an action that 403s for
 * almost every actor who sees it.
 */
export function WalletCreateMenu({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: (walletId: string) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<
    "none" | "container" | "personal" | "shared" | "container_shared"
  >("none");

  const { data: canCreateShared } = useQuery({
    queryKey: ["authority", "can-create-shared-wallet", containerId],
    queryFn: () =>
      sdk.authority.authorize({
        actor_id: user!.id,
        container_id: containerId,
        permission_code: "core.payment.wallet.create_shared",
      }),
    enabled: Boolean(user?.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "wallets", containerId],
    });

  if (mode === "none") {
    return (
      <div className="flex flex-wrap gap-2">
        <MenuButton
          label="Container wallet"
          onClick={() => setMode("container")}
        />
        <MenuButton
          label="Personal wallet"
          onClick={() => setMode("personal")}
        />
        <MenuButton label="Shared wallet" onClick={() => setMode("shared")} />
        {canCreateShared?.allowed && (
          <MenuButton
            label="Container + members wallet"
            onClick={() => setMode("container_shared")}
          />
        )}
      </div>
    );
  }

  const close = () => setMode("none");

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {mode === "container" && "New container wallet"}
          {mode === "personal" && "New personal wallet"}
          {mode === "shared" && "New shared wallet (members only)"}
          {mode === "container_shared" && "New container + members wallet"}
        </p>
        <button
          type="button"
          onClick={close}
          className="text-neutral-400 hover:text-black dark:hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {mode === "container" && (
        <ContainerWalletForm
          containerId={containerId}
          onDone={(id) => {
            invalidate();
            close();
            onCreated(id);
          }}
        />
      )}
      {mode === "personal" && (
        <PersonalWalletForm
          containerId={containerId}
          onDone={(id) => {
            invalidate();
            close();
            onCreated(id);
          }}
        />
      )}
      {(mode === "shared" || mode === "container_shared") && (
        <MultiMemberWalletForm
          containerId={containerId}
          kind={mode}
          onDone={(id) => {
            invalidate();
            close();
            onCreated(id);
          }}
        />
      )}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:border-black hover:text-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

function ContainerWalletForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: (walletId: string) => void;
}) {
  const [currency, setCurrency] = useState("USD");
  const mutation = useMutation({
    mutationFn: () =>
      sdk.payment.getOrCreateContainerWallet(
        containerId,
        currency.toUpperCase(),
      ),
    onSuccess: (wallet) => onDone(wallet.id),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex items-center gap-2"
    >
      <input
        className={`${inputClass} w-24 uppercase`}
        maxLength={3}
        value={currency}
        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Something went wrong.
        </p>
      )}
    </form>
  );
}

function PersonalWalletForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: (walletId: string) => void;
}) {
  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      sdk.payment.createPersonalWallet({
        container_id: containerId,
        currency: currency.toUpperCase(),
        label,
      }),
    onSuccess: (wallet) => onDone(wallet.id),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          placeholder='Label (e.g. "My earnings")'
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className={`${inputClass} w-24 uppercase`}
          maxLength={3}
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Something went wrong.
        </p>
      )}
    </form>
  );
}

function MultiMemberWalletForm({
  containerId,
  kind,
  onDone,
}: {
  containerId: string;
  kind: "shared" | "container_shared";
  onDone: (walletId: string) => void;
}) {
  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Actor[]>([]);

  const { data: candidates } = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => sdk.identity.listActors({
      search, limit: 10,
      containerId: ""
    }),
    enabled: search.trim().length > 1,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        container_id: containerId,
        currency: currency.toUpperCase(),
        label,
        participant_actor_ids: selected.map((a) => a.id),
      };
      return kind === "container_shared"
        ? sdk.payment.createContainerSharedWallet(payload)
        : sdk.payment.createSharedWallet(payload);
    },
    onSuccess: (wallet) => onDone(wallet.id),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          placeholder="Label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className={`${inputClass} w-24 uppercase`}
          maxLength={3}
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
        />
      </div>

      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        {kind === "container_shared"
          ? "Pick which members co-own this with the container"
          : "Pick who co-owns this wallet with you"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800"
          >
            {a.display_name}
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => prev.filter((s) => s.id !== a.id))
              }
              className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className={inputClass}
        placeholder="Search people…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {candidates && candidates.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {candidates
            .filter((a) => !selected.some((s) => s.id === a.id))
            .map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected((prev) => [...prev, a]);
                    setSearch("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  {a.display_name}
                </button>
              </li>
            ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-1 self-start rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Something went wrong
          {kind === "container_shared" ? " — are you the container owner?" : ""}
          .
        </p>
      )}
    </form>
  );
}
