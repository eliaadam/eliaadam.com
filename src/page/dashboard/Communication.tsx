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
 *
 * Below `md` there's only room for one pane, so this behaves like a
 * typical two-level mobile messaging UI: the list is the default
 * screen, and picking a conversation replaces it with the thread
 * (with a back button in the thread header) instead of squeezing both
 * into view at once.
 */
export function Communication() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-4 md:h-[75vh]">
      <div
        className={`w-full flex-none overflow-hidden rounded-lg border border-neutral-200 md:block md:w-72 dark:border-neutral-800 ${
          conversationId ? "hidden" : "block"
        }`}
      >
        <ConversationList
          selectedId={conversationId}
          onSelect={(id) => navigate(`/dashboard/communication/${id}`)}
        />
      </div>

      <div className={`min-w-0 flex-1 md:block ${conversationId ? "block" : "hidden"}`}>
        {conversationId ? (
          <ConversationThread
            conversationId={conversationId}
            onBack={() => navigate("/dashboard/communication")}
          />
        ) : (
          <div className="hidden h-full items-center justify-center rounded-lg border border-dashed border-neutral-300 md:flex dark:border-neutral-700">
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
