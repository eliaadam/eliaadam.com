import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  eventsApi as api,
  scopeBase,
  fmtDate,
  STATUS_STYLE,
  type OwnerScope,
} from "./events-api";
import OwnerScopePicker from "./OwnerScopePicker";

type Event = {
  id: string;
  event_code: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: string;
  visibility: string;
  status: string;
  published_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
};
type Category = { id: string; code: string; name: string };

export default function MyEventsPanel({
  scope,
  permissions,
}: {
  scope: OwnerScope;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const can = (c: string) => permissions.includes(c);
  const scoped = (c: string) =>
    scope.type === "container"
      ? can(`system.events.event.${c}`)
      : can(`system.events.own_event.${c}`);

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const base = scopeBase(scope);

  const events = useQuery({
    queryKey: ["events", "mine", scope],
    queryFn: () => api("GET", base),
  });
  const list: Event[] = Array.isArray(events.data) ? events.data : [];

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api("POST", `${base}/${id}/${action}`),
    onSuccess: (_d, v) => {
      setMsg(`Event ${v.action}ed.`);
      qc.invalidateQueries({ queryKey: ["events", "mine", scope] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  if (viewing) {
    return (
      <EventDetail
        scope={scope}
        eventId={viewing}
        canManage={scoped("update")}
        canPublish={scoped("publish")}
        canCancel={scoped("cancel")}
        canComplete={scoped("complete")}
        onClose={() => setViewing(null)}
        onChanged={() =>
          qc.invalidateQueries({ queryKey: ["events", "mine", scope] })
        }
      />
    );
  }

  if (creating) {
    return (
      <CreateEventForm
        scope={scope}
        containerId={scope.type === "container" ? scope.containerId : undefined}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          qc.invalidateQueries({ queryKey: ["events", "mine", scope] });
        }}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}
      {scoped("create") && (
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          + New event
        </button>
      )}
      {scope.type === "actor" && (
        <div className="text-[11px] text-neutral-400">
          Events you create here are organized by you personally — no
          organization is attached.
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {events.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No events yet.
          </div>
        ) : (
          list.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <button onClick={() => setViewing(e.id)} className="text-left">
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {e.title}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[e.status] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
                  >
                    {e.status}
                  </span>
                  {e.visibility === "public" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      public
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {e.event_code} · created {fmtDate(e.created_at)}
                </div>
              </button>
              <div className="flex gap-1">
                {e.status === "draft" && scoped("publish") && (
                  <button
                    onClick={() => act.mutate({ id: e.id, action: "publish" })}
                    className="px-2 py-1 text-[11px] rounded border border-green-400 text-green-700 dark:text-green-400"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => setViewing(e.id)}
                  className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                >
                  Manage
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EventDetail({
  scope,
  eventId,

  canPublish,
  canCancel,
  canComplete,
  onClose,
  onChanged,
}: {
  scope: OwnerScope;
  eventId: string;
  canManage: boolean;
  canPublish: boolean;
  canCancel: boolean;
  canComplete: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const base = scopeBase(scope);

  const event = useQuery({
    queryKey: ["events", "detail", scope, eventId],
    queryFn: () => api("GET", `${base}/${eventId}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["events", "detail", scope, eventId] });
    onChanged();
  };

  const act = useMutation({
    mutationFn: (action: string) => api("POST", `${base}/${eventId}/${action}`),
    onSuccess: (_d, action) => {
      setMsg(`Event ${action}ed.`);
      refresh();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const e: Event | undefined = event.data;
  if (!e) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
        {e.title}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[e.status] ?? ""}`}
        >
          {e.status}
        </span>
      </div>
      <div className="text-[11px] text-neutral-400">
        {e.event_code} · {e.visibility}
      </div>
      {e.summary && (
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          {e.summary}
        </div>
      )}
      {e.description && (
        <div className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
          {e.description}
        </div>
      )}

      <div className="text-[11px] text-neutral-400 space-y-0.5">
        {e.published_at && <div>Published {fmtDate(e.published_at)}</div>}
        {e.cancelled_at && <div>Cancelled {fmtDate(e.cancelled_at)}</div>}
        {e.completed_at && <div>Completed {fmtDate(e.completed_at)}</div>}
      </div>

      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      <div className="flex gap-2">
        {e.status === "draft" && canPublish && (
          <button
            onClick={() => act.mutate("publish")}
            disabled={act.isPending}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white disabled:opacity-40"
          >
            Publish
          </button>
        )}
        {e.status === "published" && canComplete && (
          <button
            onClick={() => act.mutate("complete")}
            disabled={act.isPending}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white disabled:opacity-40"
          >
            Mark complete
          </button>
        )}
        {!["cancelled", "completed"].includes(e.status) && canCancel && (
          <button
            onClick={() => act.mutate("cancel")}
            disabled={act.isPending}
            className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-600 disabled:opacity-40"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function CreateEventForm({
  scope: initialScope,
  containerId,
  containerName,
  onClose,
  onCreated,
}: {
  scope?: OwnerScope;
  containerId?: string; // omit entirely if this form is only ever reachable with no org available
  containerName?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [scope, setScope] = useState<OwnerScope>(
    initialScope ?? { type: "actor" },
  );

  const base = scopeBase(scope);

  const categories = useQuery({
    queryKey: ["events", "categories"],
    queryFn: () => api("GET", "/categories"),
  });
  const categoryList: Category[] = Array.isArray(categories.data)
    ? categories.data
    : [];

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const create = useMutation({
    mutationFn: () =>
      api("POST", base, {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        category_id: categoryId,
        visibility,
      }),
    onSuccess: onCreated,
  });

  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-3 max-w-xl">
      <button onClick={onClose} className="text-xs text-neutral-500">
        ← Back
      </button>
      <div className="text-lg font-semibold text-black dark:text-white">
        New event
      </div>

      {containerId && containerName && (
        <div>
          <label className="text-[11px] text-neutral-500 block mb-1">
            Who's organizing this?
          </label>
          <OwnerScopePicker
            containerId={containerId}
            containerName={containerName}
            value={scope}
            onChange={setScope}
          />
        </div>
      )}

      {scope.type === "actor" && (
        <div className="text-[11px] text-amber-600">
          You're creating this as yourself — no organization is attached.
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={`${input} w-full`}
      />
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Short summary (shown in listings)"
        rows={2}
        className={`${input} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Full description"
        rows={4}
        className={`${input} w-full`}
      />

      <div className="flex gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${input} flex-1`}
          disabled={categories.isLoading || categoryList.length === 0}
        >
          <option value="">
            {categories.isLoading
              ? "Loading categories…"
              : categoryList.length === 0
                ? "No categories available"
                : "Select category…"}
          </option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as "public" | "private")
          }
          className={input}
        >
          <option value="private">Private</option>
          <option value="public">Public — appears in Discover</option>
        </select>
      </div>

      <button
        onClick={() => create.mutate()}
        disabled={!title.trim() || !categoryId || create.isPending}
        className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {create.isPending ? "Creating…" : "Create event"}
      </button>
      {create.isError && (
        <div className="text-xs text-red-600">
          {(create.error as any)?.message}
        </div>
      )}
    </div>
  );
}
