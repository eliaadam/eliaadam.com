import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import { inputClass, secondaryButtonClass } from "./ui";

const PAGE_SIZE = 24;

export function BrowseTab({ containerId, onOpen }: { containerId: string; onOpen: (id: string) => void }) {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(0);

  const { data: kinds } = useQuery({
    queryKey: ["template-library", "kinds"],
    queryFn: () => sdk.templateLibrary.listKinds(),
  });

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ["template-library", "browse", containerId, query, kind, tag, page],
    queryFn: () =>
      sdk.templateLibrary.browseLibrary(containerId, {
        q: query || undefined,
        kind: kind || undefined,
        tag: tag || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const applyFilters = () => {
    setQuery(draftQuery.trim());
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className={`${inputClass} pl-8`}
            placeholder="Search templates…"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
          />
        </div>
        <select
          className={`${inputClass} max-w-[11rem]`}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All kinds</option>
          {kinds?.map((k) => (
            <option key={k.code} value={k.code}>{k.label}</option>
          ))}
        </select>
        <input
          className={`${inputClass} max-w-[9rem]`}
          placeholder="Tag"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setPage(0);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>Search</button>
      </form>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn't load the library — you may not have permission to browse templates in this container.
        </p>
      )}

      {templates && templates.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Package className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No public templates found.</p>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen(t.id)}
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  v{t.latest_version_number}
                </span>
              </span>
              <span className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                {t.description || "No description."}
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
                <span>{t.kind}</span>
                <span>·</span>
                <span>{t.install_count} install{t.install_count === 1 ? "" : "s"}</span>
                {t.tags.slice(0, 3).map((tg) => (
                  <span key={tg} className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{tg}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      {(page > 0 || (templates && templates.length === PAGE_SIZE)) && (
        <div className="flex items-center justify-end gap-2">
          <button type="button" className={secondaryButtonClass} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!templates || templates.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
