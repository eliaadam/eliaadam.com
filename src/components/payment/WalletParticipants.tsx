import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { sdk, type Actor, type Wallet } from "../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900";

/**
 * `canManage` is passed in rather than computed here — for a
 * "container_shared" wallet it means "is a real container owner" (the
 * Gate's wildcard step, not any capability role); for "shared" it
 * means "is an admin participant of THIS wallet." Both checks are
 * genuinely different questions, resolved by the caller
 * (`PaymentWalletDetail.tsx`), so this component only renders based
 * on the answer, it doesn't decide it.
 */
export function WalletParticipants({
  wallet,
  canManage,
}: {
  wallet: Wallet;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: participants } = useQuery({
    queryKey: ["payment", "wallet-participants", wallet.id],
    queryFn: () => sdk.payment.listWalletParticipants(wallet.id),
  });

  const { data: candidates } = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => sdk.identity.listActors({ search, limit: 10 }),
    enabled: canManage && search.trim().length > 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "wallet-participants", wallet.id],
    });

  const addMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.payment.addWalletParticipant(wallet.id, { actor_id: actorId }),
    onSuccess: () => {
      invalidate();
      setSearch("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.payment.removeWalletParticipant(wallet.id, actorId),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-500">
        {wallet.owner_type === "container_shared"
          ? "Container + members"
          : "Members"}
      </p>
      <ul className="flex flex-col gap-1.5">
        {participants?.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span>
              {p.actor_id}
              {p.role !== "member" && (
                <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-500">
                  {p.role}
                </span>
              )}
            </span>
            {canManage && p.role !== "owner" && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(p.actor_id)}
                aria-label="Remove"
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <UserMinus size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="relative mt-3">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            className={`${inputClass} pl-8`}
            placeholder="Add participant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates && candidates.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              {candidates.map((a: Actor) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => addMutation.mutate(a.id)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <UserPlus size={12} />
                    {a.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
