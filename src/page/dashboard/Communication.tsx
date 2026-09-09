import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "../../components/communication/ConversationList";
import { ConversationThread } from "../../components/communication/ConversationThread";

/**
 * Two routes point here — `/dashboard/communication` (no selection)
 * and `/dashboard/communication/:conversationId` — so the thread panel
 * is shareable/bookmarkable/refreshable via the URL, same pattern as
 * every other detail view in this app, rather than living in
 * component-local state that resets on refresh.
 */
export function Communication() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex h-[75vh] gap-4">
      <div className="w-72 flex-none overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <ConversationList
          selectedId={conversationId}
          onSelect={(id) => navigate(`/dashboard/communication/${id}`)}
        />
      </div>

      <div className="min-w-0 flex-1">
        {conversationId ? (
          <ConversationThread conversationId={conversationId} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
            <div className="text-center">
              <MessageSquare
                className="mx-auto text-neutral-400 dark:text-neutral-600"
                size={22}
              />
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
                Select a conversation, or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
