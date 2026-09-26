import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { sdk } from "../../lib/sdk";

/**
 * A reusable "Message" action — starts (or resumes, since
 * createDirectConversation is idempotent) a direct conversation with
 * a specific, known actor, scoped to a container, then navigates to
 * it via the real, existing Communication page
 * (/dashboard/communication/:conversationId — confirmed against
 * MainApp.tsx's own routes). Only usable where a real actor_id is
 * already known — this component does not resolve "the seller"/"the
 * carrier" from a container on its own; see the call site for where
 * that actor_id comes from.
 */

export function MessageButton({
  containerId,
  otherActorId,
  label = "Message",
  className,
}: {
  containerId: string;
  otherActorId: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () =>
      sdk.communication.createDirectConversation({
        container_id: containerId,
        other_actor_id: otherActorId,
      }),
    onSuccess: (conversation) => {
      navigate(`/dashboard/communication/${conversation.id}`);
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={
        className ??
        "flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
      }
    >
      <MessageCircle size={12} />
      {mutation.isPending ? "Opening…" : label}
    </button>
  );
}
