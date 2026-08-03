import { useEffect, useState } from "react";
import { apiFetch, buildQuery } from "./api";
import type { Asset, PaginatedMeta, ViewMode } from "./registry/types";
import { Mono, StatusPill, TypeTag } from "./primitives";
import { DetailPanel } from "./DetailPanel";
import { RegistryGraphView } from "./RegistryGraphView";

const ASSET_TYPES = [
  "platform",
  "domain",
  "service",
  "package",
  "contract",
  "driver",
  "capability",
];
const STATUSES = ["active", "inactive", "deprecated", "retired"];

export function ExploreView({
  initialSelectId,
  onManageCapability,
}: {
  initialSelectId: string | null;
  onManageCapability: (featureCode: string) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [selected, setSelected] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const applyAssetUpdate = (updated: Asset) => {
    setSelected((cur) =>
      cur && cur.id === updated.id ? { ...cur, ...updated } : cur,
    );
    setAssets((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
    );
  };
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery({
          asset_type: filterType !== "all" ? filterType : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          page,
          per_page: 25,
        });
        const result = await apiFetch<{ data: Asset[]; meta: PaginatedMeta }>(
          `/assets${qs}`,
        );
        if (!cancelled) {
          setAssets(result.data);
          setMeta(result.meta);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load assets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [filterType, filterStatus, page, refreshKey]);

  async function selectAsset(a: Asset) {
    try {
      const r = await apiFetch<{ data: Asset }>(`/assets/${a.id}`);
      setSelected(r.data);
    } catch {
      setSelected(a);
    }
  }

  async function selectById(id: string) {
    try {
      const r = await apiFetch<{ data: Asset }>(`/assets/${id}`);
      setSelected(r.data);
    } catch {
      // Unresolved or unreachable asset — leave the current selection as-is.
    }
  }

  // Coming over from Manage mode via "View in Registry graph" — jump
  // straight to the graph and preselect the asset that was handed off.
  useEffect(() => {
    if (initialSelectId) {
      setViewMode("graph");
      void selectById(initialSelectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectId]);

  const filtered = search.trim()
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()) ||
          a.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : assets;

  const inputCls =
    "h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black text-black dark:text-white">
      {/* Top bar */}
      <header className="flex h-auto min-h-14 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-black dark:text-white">
            Hala Registry
          </span>
          <span className="mx-1 hidden sm:inline-block h-3.5 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="hidden sm:inline text-xs text-neutral-400 dark:text-neutral-600">
            v1.0.0
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            {meta.total} assets
          </span>

          <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "list"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "graph"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
              }`}
            >
              Graph
            </button>
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {viewMode === "list" && (
          <aside
            className={`${
              selected ? "hidden lg:flex" : "flex"
            } w-full lg:w-80 shrink-0 flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800`}
          >
            <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <input
                type="text"
                placeholder="Search name, code, slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full ${inputCls}`}
              />
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className={`flex-1 ${inputCls}`}
                >
                  <option value="all">All types</option>
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className={`flex-1 ${inputCls}`}
                >
                  <option value="all">All status</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600">
                    Loading assets…
                  </span>
                </div>
              )}
              {error && (
                <div className="m-1 rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs text-black dark:text-white font-medium">
                  {error}
                </div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600">
                    No assets match.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!loading &&
                  !error &&
                  filtered.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectAsset(a)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected?.id === a.id
                          ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-tight text-black dark:text-white">
                          {a.name}
                        </span>
                        <StatusPill status={a.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <TypeTag type={a.asset_type} />
                        <Mono dim>{a.code}</Mono>
                      </div>
                      {a.description && (
                        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {a.description}
                        </p>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {meta.last_page > 1 && (
              <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-xs text-neutral-400 dark:text-neutral-600">
                  {page} / {meta.last_page}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(meta.last_page, p + 1))
                  }
                  disabled={page >= meta.last_page}
                  className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Detail / graph panel */}
        <main
          className={`${
            viewMode === "list" && !selected ? "hidden lg:block" : "block"
          } flex-1 overflow-hidden`}
        >
          {viewMode === "list" ? (
            selected ? (
              <div className="flex h-full flex-col">
                <button
                  onClick={() => setSelected(null)}
                  className="lg:hidden inline-flex w-fit items-center gap-1.5 px-4 pt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  <span aria-hidden>←</span> Back to list
                </button>
                <div className="flex-1 overflow-hidden">
                  <DetailPanel
                    asset={selected}
                    allAssets={assets}
                    onManageCapability={onManageCapability}
                    onAssetUpdated={applyAssetUpdate}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 select-none">
                <div className="grid grid-cols-3 gap-1.5 opacity-10 dark:opacity-20">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 w-3 rounded-sm bg-black dark:bg-white"
                    />
                  ))}
                </div>
                <span className="text-xs tracking-widest text-neutral-300 dark:text-neutral-700 uppercase">
                  Select an asset to inspect
                </span>
              </div>
            )
          ) : (
            <RegistryGraphView
              pageAssets={assets}
              selected={selected}
              onSelectId={selectById}
              onClearSelection={() => setSelected(null)}
              onManageCapability={onManageCapability}
              onAssetUpdated={applyAssetUpdate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
