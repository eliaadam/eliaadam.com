import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import type {
  ActorExport,
  AnalyticsEvent,
  AnalyticsEventType,
  ErasureResult,
} from "../../lib/sdk/domains/analytics";
import { ANALYTICS_EVENT_TYPES } from "../../lib/sdk/domains/analytics";
import {
  cardClass,
  ConfirmButton,
  errorMessage,
  formatTime,
  inputClass,
  labelClass,
  pillTabClass,
  primaryButtonClass,
  rowClass,
  Stat,
  TypeBadge,
} from "./analytics/ui";

/**
 * Analytics — the operator's live view of how people use the platform.
 *
 * This is the first look at the data (straight off the raw events), so it's deliberately plain: headline numbers, top pages
 * and components, a live event stream, and the privacy tools. Funnels, retention, per-user pages and charts come with
 * the rollups in the next slices.
 */

const WINDOWS: Array<[number, string]> = [
  [1, "Last hour"],
  [24, "24 hours"],
  [168, "7 days"],
  [720, "30 days"],
];

const num = (n: number) => n.toLocaleString();
const shortId = (id: string) => `${id.slice(0, 8)}…`;

export function AnalyticsDashboard() {
  const [hours, setHours] = useState(24);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics-overview", hours],
    queryFn: () => sdk.analytics.overview(hours),
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {errorMessage(error, "Couldn't load analytics.")}
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Viewing analytics needs the analytics viewer or operator role at the
          admin container, and the Analytics feature licensed there.
        </p>
      </div>
    );
  }

  const t = data?.totals;
  const maxType = Math.max(1, ...(data?.by_type.map((b) => b.count) ?? [1]));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <div className="flex gap-1.5">
          {WINDOWS.map(([h, label]) => (
            <button
              key={h}
              type="button"
              className={pillTabClass(hours === h)}
              onClick={() => setHours(h)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-neutral-500">Loading…</p>}
      {t && data && (
        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Page views" value={num(t.page_views)} />
            <Stat label="Sessions" value={num(t.sessions)} />
            <Stat
              label="Visitors"
              value={num(t.visitors)}
              hint="distinct browsers"
            />
            <Stat label="Signed-in users" value={num(t.authenticated_users)} />
            <Stat label="Events" value={num(t.events)} />
            <Stat label="Errors" value={num(t.errors)} />
          </div>
          {t.events === 0 && (
            <p
              className={`${cardClass} p-4 text-sm text-neutral-600 dark:text-neutral-400`}
            >
              Nothing collected in this window yet. If the tracker was only just
              switched on, open a few pages in another tab and give it ten
              seconds — events are sent in batches.
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Top pages
              </h2>
              <div className={cardClass}>
                {data.top_routes.length === 0 && (
                  <p className="p-3 text-sm text-neutral-500">
                    No page views yet.
                  </p>
                )}
                {data.top_routes.map((r) => (
                  <div
                    key={r.route}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${rowClass}`}
                  >
                    <span className="truncate font-mono text-xs">
                      {r.route}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                      {num(r.views)} views · {num(r.visitors)} visitors
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Events by type
              </h2>
              <div className={`${cardClass} p-3`}>
                {data.by_type.length === 0 && (
                  <p className="text-sm text-neutral-500">Nothing yet.</p>
                )}
                {data.by_type.map((b) => (
                  <div
                    key={b.type}
                    className="flex items-center gap-3 py-1 text-xs"
                  >
                    <span className="w-28 shrink-0">
                      <TypeBadge type={b.type} />
                    </span>
                    <div className="h-2 flex-1 rounded bg-neutral-100 dark:bg-neutral-900">
                      <div
                        className="h-2 rounded bg-neutral-800 dark:bg-neutral-200"
                        style={{ width: `${(b.count / maxType) * 100}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right tabular-nums text-neutral-500">
                      {num(b.count)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Components
            </h2>
            <div className={`overflow-x-auto ${cardClass}`}>
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
                    <th className="px-3 py-2 text-left font-medium">
                      Component
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Seen</th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                    <th
                      className="px-3 py-2 text-right font-medium"
                      title="Clicks per time seen. Only meaningful where both are tracked."
                    >
                      Click-through
                    </th>
                    <th
                      className="px-3 py-2 text-right font-medium"
                      title="Rage clicks and dead clicks — signs of frustration or a control that doesn't respond."
                    >
                      Friction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_components.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-sm text-neutral-500">
                        No named components yet — see the instrumentation guide
                        to name the ones you care about.
                      </td>
                    </tr>
                  )}
                  {data.top_components.map((c) => (
                    <tr
                      key={c.component}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {c.component}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {num(c.impressions)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {num(c.clicks)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                        {c.impressions > 0
                          ? `${Math.round((c.clicks / c.impressions) * 100)}%`
                          : "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${c.friction > 0 ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"}`}
                      >
                        {c.friction || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <RecentEvents />
        <PrivacyTools />
      </div>
    </div>
  );
}

function describe(e: AnalyticsEvent): string {
  return Object.entries(e.props)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("  ");
}

function RecentEvents() {
  const [type, setType] = useState<AnalyticsEventType | "">("");
  const [live, setLive] = useState(true);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics-recent", type],
    queryFn: () => sdk.analytics.recent({ limit: 60, type: type || undefined }),
    refetchInterval: live ? 10_000 : false,
  });

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Live event stream
        </h2>
        <div className="flex items-center gap-3">
          <select
            className={`${inputClass} w-44`}
            value={type}
            onChange={(e) => setType(e.target.value as AnalyticsEventType | "")}
            aria-label="Event type"
          >
            <option value="">All types</option>
            {ANALYTICS_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />{" "}
            Refresh every 10s
          </label>
        </div>
      </div>
      <div className={`max-h-[26rem] overflow-y-auto ${cardClass}`}>
        {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
        {isError && (
          <p className="p-3 text-xs text-red-600 dark:text-red-400">
            {errorMessage(error)}
          </p>
        )}
        {data?.length === 0 && (
          <p className="p-3 text-sm text-neutral-500">No events yet.</p>
        )}
        {data?.map((e) => (
          <div
            key={e.event_id}
            className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-1.5 text-xs ${rowClass}`}
          >
            <span className="w-16 shrink-0 tabular-nums text-neutral-400">
              {formatTime(e.occurred_at)}
            </span>
            <span className="w-24 shrink-0">
              <TypeBadge type={e.type} />
            </span>
            <span className="min-w-0 truncate font-mono">
              {e.route}
              {e.component && (
                <span className="text-neutral-500"> · {e.component}</span>
              )}
            </span>
            <span
              className="ml-auto shrink-0 text-neutral-400"
              title={e.actor_id ?? e.visitor_id}
            >
              {e.actor_id ? `user ${shortId(e.actor_id)}` : "anonymous"}
            </span>
            {Object.keys(e.props).length > 0 && (
              <span className="basis-full truncate pl-[7.5rem] text-neutral-400">
                {describe(e)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function download(filename: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export or erase one person's analytics data, on request. Needs the separate privacy permission. */
function PrivacyTools() {
  const [actorId, setActorId] = useState("");
  const clean = actorId.trim();
  const exportData = useMutation<ActorExport, unknown>({
    mutationFn: () => sdk.analytics.exportActor(clean),
    onSuccess: (d) => download(`analytics-${clean}.json`, d),
  });
  const erase = useMutation<ErasureResult, unknown>({
    mutationFn: () => sdk.analytics.eraseActor(clean),
  });

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Privacy tools
      </h2>
      <div className={`${cardClass} p-4`}>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Export or erase everything collected about one person. Erasing also
          removes the anonymous browsing their browser did before they signed
          in, but never another account's events from a shared browser. Needs
          the analytics operator role.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[18rem] flex-1">
            <label className={labelClass}>Account id</label>
            <input
              className={`mt-1 ${inputClass} font-mono`}
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="the person's account id (UUID)"
            />
          </div>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!clean || exportData.isPending}
            onClick={() => exportData.mutate()}
          >
            {exportData.isPending ? "Exporting…" : "Export as JSON"}
          </button>
          <ConfirmButton
            label="Erase their data"
            confirmLabel="Really erase?"
            disabled={!clean || erase.isPending}
            onConfirm={() => erase.mutate()}
          />
        </div>
        {exportData.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {errorMessage(exportData.error)}
          </p>
        )}
        {exportData.isSuccess && (
          <p className="mt-2 text-xs text-neutral-500">
            Exported {exportData.data.events.length} event(s)
            {exportData.data.truncated
              ? " (truncated at the export limit)"
              : ""}
            .
          </p>
        )}
        {erase.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {errorMessage(erase.error)}
          </p>
        )}
        {erase.isSuccess && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400">
            Erased {erase.data.events} event(s), {erase.data.sessions}{" "}
            session(s), {erase.data.links} identity link(s).
          </p>
        )}
      </div>
    </section>
  );
}
