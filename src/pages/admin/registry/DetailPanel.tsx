import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { Asset, AssetStatus, AssetVersion, DetailTab, RelationshipData } from "./registry/types";
import { Divider, Label, Mono, StatusPill, TypeTag } from "./primitives";
import { RelationshipGraph } from "./RelationshipGraph";

export function DetailPanel({
  asset,
  allAssets,
  onManageCapability,
  onAssetUpdated,
}: {
  asset: Asset;
  allAssets: Asset[];
  onManageCapability?: (featureCode: string) => void;
  onAssetUpdated?: (updated: Asset) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [versions, setVersions] = useState<AssetVersion[] | null>(null);
  const [relationships, setRelationships] = useState<RelationshipData | null>(
    null,
  );
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  const [editingAsset, setEditingAsset] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetSaveError, setAssetSaveError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState(asset.name);
  const [draftDescription, setDraftDescription] = useState(
    asset.description ?? "",
  );
  const [draftStatus, setDraftStatus] = useState<AssetStatus>(asset.status);

  useEffect(() => {
    setTab("overview");
    setVersions(null);
    setRelationships(null);
    setTabError(null);
    setEditingAsset(false);
    setAssetSaveError(null);
    setDraftName(asset.name);
    setDraftDescription(asset.description ?? "");
    setDraftStatus(asset.status);
  }, [asset.id]);

  async function saveAsset() {
    setSavingAsset(true);
    setAssetSaveError(null);
    try {
      const r = await apiFetch<{ data: Asset }>(
        `/assets/${asset.id}`,
        "PATCH",
        {
          name: draftName,
          description: draftDescription.trim() === "" ? null : draftDescription,
          status: draftStatus,
        },
      );
      onAssetUpdated?.(r.data);
      setEditingAsset(false);
    } catch (e) {
      setAssetSaveError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingAsset(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (tab === "versions" && versions === null) {
        setTabLoading(true);
        setTabError(null);
        try {
          const result = await apiFetch<{ data: AssetVersion[] }>(
            `/assets/${asset.id}/versions`,
          );
          if (!cancelled) setVersions(result.data);
        } catch (e) {
          if (!cancelled) setTabError((e as Error).message);
        } finally {
          if (!cancelled) setTabLoading(false);
        }
      } else if (tab === "relationships" && relationships === null) {
        setTabLoading(true);
        setTabError(null);
        try {
          const result = await apiFetch<{ data: RelationshipData }>(
            `/assets/${asset.id}/relationships`,
          );
          if (!cancelled) setRelationships(result.data);
        } catch (e) {
          if (!cancelled) setTabError((e as Error).message);
        } finally {
          if (!cancelled) setTabLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [tab, asset.id, versions, relationships]);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "versions", label: "Versions" },
    { key: "relationships", label: "Relationships" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 pt-5 pb-4">
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TypeTag type={asset.asset_type} />
            <StatusPill status={editingAsset ? draftStatus : asset.status} />
          </div>
          <div className="flex items-center gap-3">
            {asset.asset_type === "capability" && onManageCapability && (
              <button
                onClick={() => onManageCapability(asset.code)}
                className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Manage this capability →
              </button>
            )}
            {!editingAsset && onAssetUpdated && (
              <button
                onClick={() => setEditingAsset(true)}
                className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {editingAsset ? (
          <div className="space-y-2">
            <div>
              <Label>Name</Label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as AssetStatus)}
                className="h-9 w-full sm:w-auto rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
              >
                {(
                  [
                    "active",
                    "inactive",
                    "deprecated",
                    "retired",
                  ] as AssetStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {assetSaveError && (
              <div className="rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs font-medium text-black dark:text-white">
                {assetSaveError}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={saveAsset}
                disabled={savingAsset || draftName.trim() === ""}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                {savingAsset ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingAsset(false);
                  setAssetSaveError(null);
                  setDraftName(asset.name);
                  setDraftDescription(asset.description ?? "");
                  setDraftStatus(asset.status);
                }}
                className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="m-0 text-lg font-bold tracking-tight text-black dark:text-white">
              {asset.name}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-neutral-400 dark:text-neutral-600 break-all">
              {asset.id}
            </p>
            {asset.description && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {asset.description}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        {tabLoading && (
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Loading…
          </p>
        )}
        {tabError && (
          <div className="rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs text-black dark:text-white font-medium">
            {tabError}
          </div>
        )}

        {tab === "overview" && !tabLoading && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Code", value: asset.code },
                { label: "Slug", value: asset.slug },
                { label: "Type", value: asset.asset_type },
                { label: "Status", value: asset.status },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 min-w-0"
                >
                  <Label>{row.label}</Label>
                  <span className="font-mono text-sm font-semibold text-black dark:text-white break-all">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {Object.keys(asset.metadata ?? {}).length > 0 && (
              <>
                <Divider />
                <Label>Metadata</Label>
                <pre className="mt-1 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {JSON.stringify(asset.metadata, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        {tab === "versions" &&
          !tabLoading &&
          !tabError &&
          versions !== null && (
            <div>
              {versions.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-600">
                  No versions found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800">
                        {["Version", "Status", "Released"].map((h) => (
                          <th
                            key={h}
                            className="py-2 pr-4 text-left text-[10px] font-semibold tracking-wide text-neutral-400 dark:text-neutral-600 uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-neutral-100 dark:border-neutral-900 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                          <td className="py-2.5 pr-4 font-mono text-sm font-semibold text-black dark:text-white">
                            {v.version}
                          </td>
                          <td className="py-2.5 pr-4">
                            <StatusPill status={v.status} />
                          </td>
                          <td className="py-2.5">
                            <Mono dim>
                              {new Date(v.released_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </Mono>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        {tab === "relationships" &&
          !tabLoading &&
          !tabError &&
          relationships !== null && (
            <div className="space-y-5">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white p-3">
                <Label>Dependency Graph</Label>
                <RelationshipGraph
                  assetName={asset.name}
                  relationships={relationships}
                  allAssets={allAssets}
                />
              </div>

              {Object.keys(relationships.relationship_type_breakdown ?? {})
                .length > 0 && (
                <div>
                  <Label>Type Breakdown</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(
                      relationships.relationship_type_breakdown,
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center gap-1.5 rounded-full border border-black dark:border-white px-2.5 py-1"
                      >
                        <span className="text-xs text-black dark:text-white">
                          {type}
                        </span>
                        <span className="rounded-full bg-black text-white dark:bg-white dark:text-black px-1.5 text-[10px]">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relationships.outgoing.length > 0 && (
                <div>
                  <Label>Outgoing</Label>
                  <div className="mt-1 space-y-1.5">
                    {relationships.outgoing.map((r, i) => {
                      const target = allAssets.find(
                        (a) => a.id === r.target_asset_id,
                      );
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:border-black dark:hover:border-white transition"
                        >
                          <span className="w-full sm:w-28 shrink-0 text-[10px] text-neutral-400 dark:text-neutral-600">
                            {r.relationship_type}
                          </span>
                          <span className="hidden sm:inline text-xs text-neutral-300 dark:text-neutral-700">
                            →
                          </span>
                          <span className="font-mono text-xs font-semibold text-black dark:text-white break-all">
                            {target?.name ?? r.target_asset_id}
                          </span>
                          {target && <TypeTag type={target.asset_type} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {relationships.incoming.length > 0 && (
                <div>
                  <Label>Incoming</Label>
                  <div className="mt-1 space-y-1.5">
                    {relationships.incoming.map((r, i) => {
                      const source = allAssets.find(
                        (a) => a.id === r.source_asset_id,
                      );
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:border-black dark:hover:border-white transition"
                        >
                          <span className="font-mono text-xs font-semibold text-black dark:text-white break-all">
                            {source?.name ?? r.source_asset_id}
                          </span>
                          {source && <TypeTag type={source.asset_type} />}
                          <span className="hidden sm:inline text-xs text-neutral-300 dark:text-neutral-700">
                            →
                          </span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
                            {r.relationship_type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {relationships.outgoing.length === 0 &&
                relationships.incoming.length === 0 && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    No relationships registered.
                  </p>
                )}
            </div>
          )}
      </div>
    </div>
  );
}
