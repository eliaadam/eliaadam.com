import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { sdk } from "../../lib/sdk";
import { MessageButton } from "./MessageButton";

/**
 * "Message" a container by picking one of its own active members to
 * DM — container.ts's own Container type has no actor field at all
 * (container_owner_id is a container-to-container tenancy reference,
 * not an actor — confirmed against the real backend source; an
 * earlier version of this component wrongly used a
 * created_by_actor_id field that doesn't exist on this type at all).
 * The real "owner" concept lives in domains.authority's own
 * RoleAssignment system (role code "container-owner"), which
 * container.ts doesn't expose a way to query — so rather than guess
 * at another SDK's shape, this resolves to Membership.role instead:
 * genuinely open text, not a fixed union, so a member whose role
 * string looks ownership-like is offered as the default pick, and
 * every other active member is one click away — never a silent,
 * possibly-wrong guess about who "the owner" is.
 */

function looksLikeOwner(role: string): boolean {
  const lower = role.toLowerCase();
  return lower.includes("owner") || lower.includes("admin");
}

export function MessageContainerButton({
  containerId,
  label = "Message",
}: {
  containerId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["container", "members", containerId],
    queryFn: () => sdk.container.listMembers(containerId, "active"),
    enabled: open,
  });

  const suggested = members?.find((m) => looksLikeOwner(m.role));
  const others = members?.filter((m) => m !== suggested) ?? [];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        <MessageCircle size={12} />
        {label}
      </button>
    );
  }

  if (members && members.length === 0) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        No members to message.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
      {!members && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}
      {suggested && (
        <MessageButton
          containerId={containerId}
          otherActorId={suggested.actor_id}
          label={`Message ${suggested.role}`}
          className="flex items-center gap-1 rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
        />
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-1">
          {suggested && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
              Or message another member:
            </p>
          )}
          {others.map((m) => (
            <MessageButton
              key={m.id}
              containerId={containerId}
              otherActorId={m.actor_id}
              label={`${m.actor_id} (${m.role})`}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
