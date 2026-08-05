import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi as api } from "./content-api";
import LinkIcon from "./LinkIcon";

type Link = {
  id: string;
  label: string;
  description: string | null;
  url: string;
  type: string;
  icon: string;
  icon_override: string | null;
};
type LinkType = { type: string; default_icon: string };

/** The reusable link library — links posts can reference. */
export default function LinkLibraryPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const canManage = can("system.content.link.manage");

  const links = useQuery({
    queryKey: ["content", "links", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/links`),
  });
  const types = useQuery({
    queryKey: ["content", "link-types"],
    queryFn: () => api("GET", `/link-types`),
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      api("DELETE", `/containers/${containerId}/links/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["content", "links", containerId] }),
  });

  const list: Link[] = Array.isArray(links.data) ? links.data : [];
  const typeList: LinkType[] = Array.isArray(types.data) ? types.data : [];

  return (
    <div className="p-4 space-y-4">
      {canManage && (
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          {creating ? "Close" : "+ Add link"}
        </button>
      )}

      {creating && canManage && (
        <LinkForm
          containerId={containerId}
          types={typeList}
          onDone={() => {
            setCreating(false);
            qc.invalidateQueries({
              queryKey: ["content", "links", containerId],
            });
          }}
        />
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {links.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No links yet. Add reusable links to reference from posts.
          </div>
        ) : (
          list.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-neutral-500 shrink-0">
                  <LinkIcon name={l.icon} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    {l.label}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {l.type}
                    </span>
                  </div>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 truncate block max-w-md"
                  >
                    {l.url}
                  </a>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => del.mutate(l.id)}
                  className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LinkForm({
  containerId,
  types,
  onDone,
}: {
  containerId: string;
  types: LinkType[];
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("external");
  const [icon, setIcon] = useState(""); // "" = derive from type

  const save = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/links`, {
        label: label.trim(),
        url: url.trim(),
        description: description.trim() || null,
        type,
        icon: icon || null,
      }),
    onSuccess: onDone,
  });

  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";
  const chosenDefault =
    types.find((t) => t.type === type)?.default_icon ?? "external-link";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label"
        className={`${input} w-full`}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className={`${input} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={`${input} w-full`}
      />
      <div className="flex gap-2 items-center flex-wrap">
        <label className="text-[11px] text-neutral-500">Type</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setIcon("");
          }}
          className={input}
        >
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {t.type}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
          icon: <LinkIcon name={icon || chosenDefault} />{" "}
          {icon ? `(${icon})` : "(from type)"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[11px] text-neutral-500 self-center mr-1">
          override icon:
        </span>
        {types.map((t) => (
          <button
            key={t.default_icon}
            type="button"
            onClick={() => setIcon(t.default_icon)}
            className={`p-1.5 rounded border ${icon === t.default_icon ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-neutral-300 dark:border-neutral-700"}`}
            title={t.default_icon}
          >
            <LinkIcon name={t.default_icon} />
          </button>
        ))}
        {icon && (
          <button
            type="button"
            onClick={() => setIcon("")}
            className="text-[11px] text-neutral-500 underline self-center"
          >
            clear
          </button>
        )}
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={!label.trim() || !url.trim() || save.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        Save link
      </button>
      {save.isError && (
        <span className="ml-2 text-xs text-red-600">
          {(save.error as any)?.message}
        </span>
      )}
    </div>
  );
}
