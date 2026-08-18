import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsApi as api, fmtDate } from "./events-api";

type Event = {
  id: string;
  event_code: string;
  title: string;
  summary: string | null;
  status: string;
  published_at: string | null;
};

/** Public browse — no scope, no ownership involved. Anyone authenticated
 *  can see published+public events regardless of who organizes them. */
export default function DiscoverEventsPanel() {
  const [q, setQ] = useState("");

  const events = useQuery({
    queryKey: ["events", "discover", q],
    queryFn: () =>
      api("GET", `/discover${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
  const list: Event[] = Array.isArray(events.data) ? events.data : [];

  return (
    <div className="p-4 space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events…"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
      />

      {events.isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No public events found.</div>
      ) : (
        <div className="space-y-2">
          {list.map((e) => (
            <div
              key={e.id}
              className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3"
            >
              <div className="text-sm font-medium text-black dark:text-white">
                {e.title}
              </div>
              {e.summary && (
                <div className="text-[11px] text-neutral-400 mt-1">
                  {e.summary}
                </div>
              )}
              <div className="text-[11px] text-neutral-400 mt-1">
                {e.event_code} · published {fmtDate(e.published_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
