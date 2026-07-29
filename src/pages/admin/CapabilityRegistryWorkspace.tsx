import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import CreateCapabilityModal from "./CreateCapabilityModal";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

/** Used for /api/authority/*, /api/hierarchy/* — unwraps straight to `.data`. */
async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.errors = j.errors;
    throw e;
  }
  return j.data ?? j;
}

/**
 * Used for /api/registry/* — returns the raw body ({data, metadata} or
 * {data, meta}) rather than unwrapping, because several call sites need the
 * sibling keys (pagination `meta`, or just want to destructure `.data`
 * themselves). Defaults to GET; pass a method/body for writes.
 */
async function apiFetch<T>(
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}/api/registry${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${localStorage.getItem("maicore_token")}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const respBody = await res.json().catch(() => ({}));
    const err: any = new Error(respBody.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.errors = respBody.errors;
    throw err;
  }
  return res.json();
}

/* ── capability-side types ───────────────────────────────────────── */

type Capability = {
  code: string;
  display_name: string;
  description: string | null;
  is_module: boolean;
  resources: { code: string; display_name: string }[];
  permissions: {
    id: string;
    code: string;
    display_name: string;
    resource_code: string;
    action_code: string;
  }[];
  roles: {
    id: string;
    code: string;
    display_name: string;
    permissions: string[];
  }[];
  container_count: number;
};

type CatalogEntry = {
  feature_code: string;
  display_name: string;
  description: string | null;
  tier: string;
  origin?: string; // 'manifest' | 'custom' — may be absent on older payloads
  has_frontend: boolean;
  is_universal: boolean;
  family: { code: string; display_name: string; icon: string | null } | null;
  industries: { code: string; display_name: string }[];
  tags: string[];
  internal_uses: { feature_code: string; nature: string; optional: boolean }[];
};

type Mapping = {
  container_id: string;
  enabled: boolean;
  access_mode: "role_required" | "open_to_members";
  container_display_name: string;
  container_code: string;
  container_path: string;
  container_status: string;
};

type Container = {
  id: string;
  code: string;
  display_name: string;
  path?: string;
};

/* ── registry-side types ──────────────────────────────────────────── */

type AssetType =
  | "platform"
  | "domain"
  | "service"
  | "package"
  | "contract"
  | "driver"
  | "capability";
type AssetStatus = "active" | "inactive" | "deprecated" | "retired";
type VersionStatus = "draft" | "active" | "deprecated" | "retired";
type DetailTab = "overview" | "versions" | "relationships";
type ViewMode = "list" | "graph";

interface Asset {
  id: string;
  asset_type: AssetType;
  code: string;
  slug: string;
  name: string;
  description: string;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  versions?: AssetVersion[];
  source_relationships?: Relationship[];
  target_relationships?: Relationship[];
}

interface AssetVersion {
  id: string;
  version: string;
  status: VersionStatus;
  released_at: string;
  metadata: Record<string, unknown>;
}

interface RelationshipData {
  outgoing: { relationship_type: string; target_asset_id: string }[];
  incoming: { relationship_type: string; source_asset_id: string }[];
  relationship_type_breakdown: Record<string, number>;
}

interface Relationship {
  relationship_type: string;
  target_asset_id?: string;
  source_asset_id?: string;
}

interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
}

/* ── documentation types (new) ───────────────────────────────────── */

type DocCategory = {
  code: string;
  display_name: string;
  description: string | null;
  status: string;
};

type RegistryDocument = {
  id: string;
  asset_id: string;
  version_id: string;
  category: { code: string; display_name: string } | null;
  title: string;
  slug: string;
  status: string;
  metadata: Record<string, unknown>;
  content: string | null;
  created_at: string;
  updated_at: string;
};

/* ── registry primitives ──────────────────────────────────────────── */

const STATUS_STYLES: Record<AssetStatus | VersionStatus, string> = {
  active: "bg-black text-white dark:bg-white dark:text-black",
  draft:
    "border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400",
  inactive:
    "border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400",
  deprecated:
    "border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400",
  retired:
    "border border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 line-through",
};

function StatusPill({ status }: { status: AssetStatus | VersionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        STATUS_STYLES[status] ??
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
      }`}
    >
      {status}
    </span>
  );
}

function TypeTag({ type }: { type: AssetType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {type}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
      {children}
    </span>
  );
}

function Mono({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span
      className={`font-mono text-xs ${
        dim
          ? "text-neutral-400 dark:text-neutral-600"
          : "text-neutral-600 dark:text-neutral-400"
      }`}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div className="my-4 border-t border-neutral-100 dark:border-neutral-900" />
  );
}

/**
 * @uiw/react-md-editor themes itself via a `data-color-mode` attribute
 * rather than reading Tailwind's `dark:` classes, so it needs telling
 * separately. This watches <html class="dark"> — however the rest of the
 * app is toggling that class already — and re-renders when it flips.
 */
function useIsDarkMode(): boolean {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setDark(el.classList.contains("dark")),
    );
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

// ─── Relationship Graph (fixed light canvas, by design) ────────────
// Compact 2D ego-diagram used inside the Relationships tab. The full 3D
// explorer (RegistryGraphView, further below) is a separate, heavier view.

function RelationshipGraph({
  assetName,
  relationships,
  allAssets,
}: {
  assetName: string;
  relationships: RelationshipData;
  allAssets: Asset[];
}) {
  const W = 440,
    H = 240,
    CX = W / 2,
    CY = H / 2,
    R = 88;

  const outgoing = relationships.outgoing ?? [];
  const incoming = relationships.incoming ?? [];
  const total = outgoing.length + incoming.length;

  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
        <span className="text-xs text-neutral-400 dark:text-neutral-600">
          No relationships registered
        </span>
      </div>
    );
  }

  type NodeDir = "out" | "in";
  interface GraphNode {
    id: string;
    label: string;
    x: number;
    y: number;
    dir: NodeDir;
    relType: string;
  }

  const nodes: GraphNode[] = [];

  outgoing.forEach((rel, i) => {
    const count = outgoing.length;
    const spread = Math.min(1.2, 0.6 * count);
    const angle =
      -Math.PI / 2 - spread / 2 + (count > 1 ? (i / (count - 1)) * spread : 0);
    const asset = allAssets.find((a) => a.id === rel.target_asset_id);
    nodes.push({
      id: rel.target_asset_id,
      label: asset?.name ?? rel.target_asset_id.slice(-6),
      x: CX + R * Math.cos(count === 1 ? -Math.PI / 2 : angle),
      y: CY + R * Math.sin(count === 1 ? -Math.PI / 2 : angle),
      dir: "out",
      relType: rel.relationship_type,
    });
  });

  incoming.forEach((rel, i) => {
    const count = incoming.length;
    const spread = Math.min(1.2, 0.6 * count);
    const angle =
      Math.PI / 2 - spread / 2 + (count > 1 ? (i / (count - 1)) * spread : 0);
    const asset = allAssets.find((a) => a.id === rel.source_asset_id);
    nodes.push({
      id: rel.source_asset_id ?? "",
      label: asset?.name ?? (rel.source_asset_id ?? "").slice(-6),
      x: CX + R * Math.cos(count === 1 ? Math.PI / 2 : angle),
      y: CY + R * Math.sin(count === 1 ? Math.PI / 2 : angle),
      dir: "in",
      relType: rel.relationship_type,
    });
  });

  const shortName = (s: string) => (s.length > 7 ? s.slice(0, 6) + "…" : s);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Dependency graph"
    >
      <defs>
        <marker
          id="arr-out"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0,0 7,3.5 0,7" fill="#000" />
        </marker>
        <marker
          id="arr-in"
          markerWidth="7"
          markerHeight="7"
          refX="1"
          refY="3.5"
          orient="auto"
        >
          <polygon points="7,0 0,3.5 7,7" fill="#999" />
        </marker>
      </defs>

      {nodes.map((n, i) => {
        const dx = n.x - CX,
          dy = n.y - CY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len,
          uy = dy / len;
        const srcR = 22,
          dstR = 16;

        return (
          <g key={i}>
            <line
              x1={CX + ux * srcR}
              y1={CY + uy * srcR}
              x2={n.x - ux * (dstR + 7)}
              y2={n.y - uy * (dstR + 7)}
              stroke={n.dir === "out" ? "#000" : "#bbb"}
              strokeWidth={1}
              strokeDasharray={n.dir === "in" ? "4 3" : "none"}
              markerEnd={n.dir === "out" ? "url(#arr-out)" : "url(#arr-in)"}
            />
            <text
              x={(CX + n.x) / 2 - uy * 10}
              y={(CY + n.y) / 2 + ux * 10}
              textAnchor="middle"
              fontSize="7"
              fill="#999"
              fontFamily="monospace"
            >
              {n.relType}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={22} fill="#000" />
      <text
        x={CX}
        y={CY + 4}
        textAnchor="middle"
        fontSize="8.5"
        fill="#fff"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {shortName(assetName)}
      </text>

      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={16}
            fill={n.dir === "out" ? "#fff" : "#f5f5f5"}
            stroke="#000"
            strokeWidth={1}
          />
          <text
            x={n.x}
            y={n.y + 3.5}
            textAnchor="middle"
            fontSize="7.5"
            fill="#000"
            fontFamily="monospace"
          >
            {shortName(n.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Detail Panel (asset-centric, used in Explore mode) ────────────

function DetailPanel({
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
      <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 pt-5 pb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
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
                className="h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
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
            <p className="mt-0.5 font-mono text-xs text-neutral-400 dark:text-neutral-600">
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

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
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
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <Label>{row.label}</Label>
                  <span className="font-mono text-sm font-semibold text-black dark:text-white">
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
                <table className="w-full border-collapse text-sm">
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
                          className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:border-black dark:hover:border-white transition"
                        >
                          <span className="w-28 shrink-0 text-[10px] text-neutral-400 dark:text-neutral-600">
                            {r.relationship_type}
                          </span>
                          <span className="text-xs text-neutral-300 dark:text-neutral-700">
                            →
                          </span>
                          <span className="font-mono text-xs font-semibold text-black dark:text-white">
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
                          className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:border-black dark:hover:border-white transition"
                        >
                          <span className="font-mono text-xs font-semibold text-black dark:text-white">
                            {source?.name ?? r.source_asset_id}
                          </span>
                          {source && <TypeTag type={source.asset_type} />}
                          <span className="text-xs text-neutral-300 dark:text-neutral-700">
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

// ─── 3D Graph View — force-directed registry explorer ──────────────
//
// Nodes are the assets currently loaded on the page (a "cloud" with no
// edges until you select one). Selecting an asset fetches its outgoing/
// incoming relationships and draws them as edges; any related asset not
// on the current page appears as a small low-poly "ghost" node you can
// click to jump straight to it, even though it was never in the list.

interface SimNode {
  id: string;
  name: string;
  code: string | null;
  assetType: AssetType | null;
  status: AssetStatus | null;
  isGhost: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  degree: number;
}

interface SimEdge {
  source: string;
  target: string;
  relationshipType: string;
  direction: "out" | "in";
}

type NodeLabelField = "name" | "code" | "asset_type";

interface SceneParams {
  ambientIntensity: number;
  pointIntensity: number;
  repulsion: number;
  springStrength: number;
  edgeLength: number;
  centering: number;
  damping: number;
  nodeScale: number;
  showNodeLabels: boolean;
  showEdgeLabels: boolean;
  nodeLabelField: NodeLabelField;
  fadeEnabled: boolean;
  fadeNear: number;
  fadeFar: number;
}

const DEFAULT_SCENE_PARAMS: SceneParams = {
  ambientIntensity: 0.7,
  pointIntensity: 0.9,
  repulsion: 6,
  springStrength: 1.4,
  edgeLength: 3,
  centering: 0.06,
  damping: 0.88,
  nodeScale: 1,
  showNodeLabels: true,
  showEdgeLabels: false,
  nodeLabelField: "name",
  fadeEnabled: true,
  fadeNear: 20,
  fadeFar: 70,
};

// Grayscale "tone" per asset type — platform/domain sit at the top of
// the stack conceptually, so they stay brightest, mirroring how audit's
// graph emphasises security/system. No new accent colors introduced.
const ASSET_TYPE_TONE: Record<AssetType, number> = {
  contract: 0.32,
  driver: 0.4,
  capability: 0.48,
  service: 0.56,
  package: 0.64,
  domain: 0.82,
  platform: 1,
};

const GHOST_TONE = 0.4;

function nodeBaseColor(assetType: AssetType | null): THREE.Color {
  const tone = assetType ? ASSET_TYPE_TONE[assetType] : GHOST_TONE;
  return new THREE.Color(tone, tone, tone);
}

function nodeLabelText(node: SimNode, field: NodeLabelField): string {
  if (field === "code") return node.code ?? node.name;
  if (field === "asset_type") return node.assetType ?? "unresolved";
  return node.name;
}

function randomPosition(): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2 + Math.random() * 3;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    (Math.random() - 0.5) * 3,
    Math.sin(angle) * radius,
  );
}

function useRegistryGraph(
  pageAssets: Asset[],
  selectedId: string | null,
  relationships: RelationshipData | null,
  localGraph: boolean,
  resetSignal: number,
) {
  const posCache = useMemo<
    Map<string, { position: THREE.Vector3; velocity: THREE.Vector3 }>
  >(() => new Map(), [resetSignal]);

  return useMemo(() => {
    const cache = posCache;

    function slot(id: string) {
      let entry = cache.get(id);
      if (!entry) {
        entry = { position: randomPosition(), velocity: new THREE.Vector3() };
        cache.set(id, entry);
      }
      return entry;
    }

    const nodeMap = new Map<string, SimNode>();

    pageAssets.forEach((a) => {
      const s = slot(a.id);
      nodeMap.set(a.id, {
        id: a.id,
        name: a.name,
        code: a.code,
        assetType: a.asset_type,
        status: a.status,
        isGhost: false,
        position: s.position,
        velocity: s.velocity,
        degree: 0,
      });
    });

    const edges: SimEdge[] = [];

    if (selectedId && relationships) {
      relationships.outgoing.forEach((r) => {
        if (!nodeMap.has(r.target_asset_id)) {
          const s = slot(r.target_asset_id);
          nodeMap.set(r.target_asset_id, {
            id: r.target_asset_id,
            name: r.target_asset_id.slice(-6),
            code: null,
            assetType: null,
            status: null,
            isGhost: true,
            position: s.position,
            velocity: s.velocity,
            degree: 0,
          });
        }
        edges.push({
          source: selectedId,
          target: r.target_asset_id,
          relationshipType: r.relationship_type,
          direction: "out",
        });
      });

      relationships.incoming.forEach((r) => {
        const srcId = r.source_asset_id ?? "";
        if (!srcId) return;
        if (!nodeMap.has(srcId)) {
          const s = slot(srcId);
          nodeMap.set(srcId, {
            id: srcId,
            name: srcId.slice(-6),
            code: null,
            assetType: null,
            status: null,
            isGhost: true,
            position: s.position,
            velocity: s.velocity,
            degree: 0,
          });
        }
        edges.push({
          source: srcId,
          target: selectedId,
          relationshipType: r.relationship_type,
          direction: "in",
        });
      });
    }

    edges.forEach((e) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (s) s.degree += 1;
      if (t) t.degree += 1;
    });

    let nodes = Array.from(nodeMap.values());

    if (localGraph && selectedId) {
      const keep = new Set<string>([selectedId]);
      edges.forEach((e) => {
        keep.add(e.source);
        keep.add(e.target);
      });
      nodes = nodes.filter((n) => keep.has(n.id));
    }

    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageAssets, selectedId, relationships, localGraph, posCache]);
}

function edgeKey(e: SimEdge, i: number): string {
  return `${e.source}__${e.target}__${e.direction}__${i}`;
}

function updateLineGeometry(
  geom: THREE.BufferGeometry | null,
  nodeMap: Map<string, SimNode>,
  edges: SimEdge[],
  direction: "out" | "in",
) {
  if (!geom) return;
  const relevant = edges.filter((e) => e.direction === direction);
  const positions = new Float32Array(relevant.length * 6);
  let ptr = 0;
  relevant.forEach((e) => {
    const a = nodeMap.get(e.source);
    const b = nodeMap.get(e.target);
    if (!a || !b) {
      ptr += 6;
      return;
    }
    positions[ptr++] = a.position.x;
    positions[ptr++] = a.position.y;
    positions[ptr++] = a.position.z;
    positions[ptr++] = b.position.x;
    positions[ptr++] = b.position.y;
    positions[ptr++] = b.position.z;
  });
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.attributes.position.needsUpdate = true;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-400">
        <span>{label}</span>
        <span className="font-mono text-neutral-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-white"
      />
    </label>
  );
}

interface GraphSceneProps {
  nodes: SimNode[];
  edges: SimEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  searchTerm: string;
  paused: boolean;
  params: SceneParams;
}

function GraphScene({
  nodes,
  edges,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  searchTerm,
  paused,
  params,
}: GraphSceneProps) {
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const outGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const inGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const edgeGroupRefs = useRef<Map<string, THREE.Group>>(new Map());

  const neighborSet = useMemo(() => {
    const focus = hoveredId ?? selectedId;
    if (!focus) return null;
    const set = new Set<string>([focus]);
    edges.forEach((e) => {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    });
    return set;
  }, [hoveredId, selectedId, edges]);

  const matchedIds = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.name.toLowerCase().includes(term) ||
        (n.code ?? "").toLowerCase().includes(term)
      ) {
        set.add(n.id);
      }
    });
    return set;
  }, [searchTerm, nodes]);

  const focusId = hoveredId ?? selectedId;

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const list = nodesRef.current;
    const nodeMap = new Map(list.map((n) => [n.id, n]));

    if (!paused) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const diff = a.position.clone().sub(b.position);
          let dist = diff.length();
          if (dist < 0.01) dist = 0.01;
          const force = params.repulsion / (dist * dist);
          diff.normalize().multiplyScalar(force);
          a.velocity.addScaledVector(diff, dt);
          b.velocity.addScaledVector(diff, -dt);
        }
      }

      edges.forEach((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) return;
        const diff = b.position.clone().sub(a.position);
        const dist = diff.length() || 0.01;
        const stretch = dist - params.edgeLength;
        diff.normalize().multiplyScalar(stretch * params.springStrength);
        a.velocity.addScaledVector(diff, dt);
        b.velocity.addScaledVector(diff, -dt);
      });

      list.forEach((n) => {
        n.velocity.addScaledVector(
          n.position.clone().multiplyScalar(-params.centering),
          dt,
        );
        n.velocity.multiplyScalar(params.damping);
        n.position.addScaledVector(n.velocity, dt * 4);
      });
    }

    list.forEach((n) => {
      const mesh = meshRefs.current.get(n.id);
      if (mesh) mesh.position.copy(n.position);
    });

    edges.forEach((e, i) => {
      const group = edgeGroupRefs.current.get(edgeKey(e, i));
      if (!group) return;
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (a && b) {
        group.position.copy(a.position).add(b.position).multiplyScalar(0.5);
      }
    });

    updateLineGeometry(outGeomRef.current, nodeMap, edges, "out");
    updateLineGeometry(inGeomRef.current, nodeMap, edges, "in");
  });

  return (
    <>
      {params.fadeEnabled && (
        <fog attach="fog" args={["#050505", params.fadeNear, params.fadeFar]} />
      )}
      <ambientLight intensity={params.ambientIntensity} />
      <pointLight position={[8, 10, 10]} intensity={params.pointIntensity} />

      <lineSegments>
        <bufferGeometry ref={outGeomRef} />
        <lineBasicMaterial color="#b0b0b0" transparent opacity={0.6} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry ref={inGeomRef} />
        <lineBasicMaterial color="#5c5c5c" transparent opacity={0.4} />
      </lineSegments>

      {edges.map((e, i) => {
        const showLabel =
          params.showEdgeLabels &&
          (!focusId || e.source === focusId || e.target === focusId);
        return (
          <group
            key={edgeKey(e, i)}
            ref={(g: THREE.Group | null) => {
              if (g) edgeGroupRefs.current.set(edgeKey(e, i), g);
              else edgeGroupRefs.current.delete(edgeKey(e, i));
            }}
          >
            {showLabel && (
              <Html
                center
                distanceFactor={14}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className={`whitespace-nowrap rounded px-1 py-0.5 font-mono text-[9px] ${
                    e.direction === "out"
                      ? "bg-black/80 text-neutral-200"
                      : "bg-black/60 text-neutral-400"
                  }`}
                >
                  {e.relationshipType}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {nodes.map((n) => {
        const isHovered = hoveredId === n.id;
        const isSelected = selectedId === n.id;
        const inNeighborhood = neighborSet ? neighborSet.has(n.id) : true;
        const matched = matchedIds ? matchedIds.has(n.id) : true;
        const dimmed =
          (!inNeighborhood || !matched) && !isHovered && !isSelected;
        const brokenStatus =
          n.status === "deprecated" || n.status === "retired";
        const scale =
          (0.16 +
            Math.min(n.degree, 8) * 0.03 +
            (isHovered || isSelected ? 0.07 : 0)) *
          params.nodeScale;
        const showLabel = params.showNodeLabels && !dimmed;

        return (
          <mesh
            key={n.id}
            ref={(m: THREE.Mesh | null) => {
              if (m) meshRefs.current.set(n.id, m);
              else meshRefs.current.delete(n.id);
            }}
            scale={scale}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(n.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHover(null);
              document.body.style.cursor = "auto";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.id);
            }}
          >
            {n.isGhost ? (
              <icosahedronGeometry args={[1, 0]} />
            ) : (
              <sphereGeometry args={[1, 16, 16]} />
            )}
            <meshStandardMaterial
              color={nodeBaseColor(n.assetType)}
              wireframe={brokenStatus}
              transparent
              opacity={dimmed ? 0.12 : n.isGhost ? 0.65 : 1}
              emissive={
                isSelected ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0)
              }
              emissiveIntensity={isSelected ? 0.5 : 0}
            />
            {showLabel && (
              <Html
                center
                distanceFactor={10}
                position={[0, 1.6, 0]}
                style={{ pointerEvents: "none" }}
              >
                <span className="whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-neutral-100">
                  {nodeLabelText(n, params.nodeLabelField)}
                </span>
              </Html>
            )}
          </mesh>
        );
      })}
    </>
  );
}

function GraphLegend() {
  return (
    <div className="pointer-events-none flex flex-col gap-1.5 text-[10px] text-neutral-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/90" />
        <span>platform / domain — emphasised</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-neutral-500" />
        <span>other asset types, by tone</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rotate-45 border border-neutral-400" />
        <span>low-poly = off-page / unresolved</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-neutral-400" />
        <span>hollow = deprecated / retired</span>
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-300" /> outgoing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-600" /> incoming
        </span>
      </div>
    </div>
  );
}

function RegistryGraphView({
  pageAssets,
  selected,
  onSelectId,
  onClearSelection,
  onManageCapability,
  onAssetUpdated, // add
}: {
  pageAssets: Asset[];
  selected: Asset | null;
  onSelectId: (id: string) => void;
  onClearSelection: () => void;
  onManageCapability?: (featureCode: string) => void;
  onAssetUpdated?: (updated: Asset) => void; // add
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [localGraph, setLocalGraph] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [params, setParams] = useState<SceneParams>(DEFAULT_SCENE_PARAMS);
  const [showSettings, setShowSettings] = useState(false);

  const [relationships, setRelationships] = useState<RelationshipData | null>(
    null,
  );
  const [relError, setRelError] = useState<string | null>(null);

  const updateParam = <K extends keyof SceneParams>(
    key: K,
    value: SceneParams[K],
  ) => setParams((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    setRelationships(null);
    setRelError(null);
    if (!selected) return;
    apiFetch<{ data: RelationshipData }>(`/assets/${selected.id}/relationships`)
      .then((r) => {
        if (!cancelled) setRelationships(r.data);
      })
      .catch((e) => {
        if (!cancelled)
          setRelError(
            e instanceof Error ? e.message : "Failed to load relationships.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) setLocalGraph(false);
  }, [selected]);

  const { nodes, edges } = useRegistryGraph(
    pageAssets,
    selected?.id ?? null,
    relationships,
    localGraph,
    resetSignal,
  );

  return (
    <div className="relative h-full w-full bg-[#0a0a0b]">
      <Canvas camera={{ position: [0, 0, 14], fov: 50 }}>
        <GraphScene
          nodes={nodes}
          edges={edges}
          selectedId={selected?.id ?? null}
          onSelect={onSelectId}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          searchTerm={searchTerm}
          paused={paused}
          params={params}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.15}
          minDistance={3}
          maxDistance={150}
          makeDefault
        />
      </Canvas>

      {/* Floating control panel, Obsidian-graph-view style */}
      <div className="pointer-events-auto absolute left-4 top-4 w-64 space-y-3 rounded-xl border border-neutral-800 bg-black/80 p-3 backdrop-blur">
        <input
          type="text"
          placeholder="Search name or code…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 w-full rounded-lg border border-neutral-700 bg-black px-2.5 text-xs text-white outline-none focus:border-white transition-colors"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setLocalGraph((v) => !v)}
            disabled={!selected}
            className="flex-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition disabled:cursor-not-allowed disabled:opacity-30"
          >
            {localGraph ? "Show full graph" : "Local graph"}
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <button
          onClick={() => setResetSignal((s) => s + 1)}
          className="w-full rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
        >
          Reheat layout
        </button>

        {/* Labels */}
        <div className="space-y-1.5 border-t border-neutral-800 pt-2">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>Labels</span>
          </div>
          <div className="flex gap-1.5">
            <label className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 px-1.5 py-1 text-[10px] text-neutral-300">
              <input
                type="checkbox"
                checked={params.showNodeLabels}
                onChange={(e) =>
                  updateParam("showNodeLabels", e.target.checked)
                }
                className="accent-white"
              />
              Nodes
            </label>
            <label className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 px-1.5 py-1 text-[10px] text-neutral-300">
              <input
                type="checkbox"
                checked={params.showEdgeLabels}
                onChange={(e) =>
                  updateParam("showEdgeLabels", e.target.checked)
                }
                className="accent-white"
              />
              Edges
            </label>
          </div>
          {params.showNodeLabels && (
            <select
              value={params.nodeLabelField}
              onChange={(e) =>
                updateParam("nodeLabelField", e.target.value as NodeLabelField)
              }
              className="h-7 w-full rounded-lg border border-neutral-700 bg-black px-2 text-[10px] text-neutral-200 outline-none focus:border-white"
            >
              <option value="name">Label: name</option>
              <option value="code">Label: code</option>
              <option value="asset_type">Label: asset type</option>
            </select>
          )}
        </div>

        {/* Scene settings */}
        <div className="border-t border-neutral-800 pt-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400 hover:text-white"
          >
            <span>Scene settings</span>
            <span>{showSettings ? "−" : "+"}</span>
          </button>

          {showSettings && (
            <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-1">
              <label className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>Fade with distance</span>
                <input
                  type="checkbox"
                  checked={params.fadeEnabled}
                  onChange={(e) => updateParam("fadeEnabled", e.target.checked)}
                  className="accent-white"
                />
              </label>
              {params.fadeEnabled && (
                <>
                  <SliderRow
                    label="Fade start distance"
                    value={params.fadeNear}
                    min={5}
                    max={100}
                    step={1}
                    onChange={(v) =>
                      updateParam("fadeNear", Math.min(v, params.fadeFar - 1))
                    }
                  />
                  <SliderRow
                    label="Fade end distance"
                    value={params.fadeFar}
                    min={10}
                    max={200}
                    step={1}
                    onChange={(v) =>
                      updateParam("fadeFar", Math.max(v, params.fadeNear + 1))
                    }
                  />
                </>
              )}
              <SliderRow
                label="Ambient light"
                value={params.ambientIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => updateParam("ambientIntensity", v)}
              />
              <SliderRow
                label="Point light"
                value={params.pointIntensity}
                min={0}
                max={3}
                step={0.05}
                onChange={(v) => updateParam("pointIntensity", v)}
              />
              <SliderRow
                label="Repulsion"
                value={params.repulsion}
                min={0.5}
                max={20}
                step={0.5}
                onChange={(v) => updateParam("repulsion", v)}
              />
              <SliderRow
                label="Spring strength"
                value={params.springStrength}
                min={0.1}
                max={4}
                step={0.1}
                onChange={(v) => updateParam("springStrength", v)}
              />
              <SliderRow
                label="Edge length"
                value={params.edgeLength}
                min={0.5}
                max={8}
                step={0.1}
                onChange={(v) => updateParam("edgeLength", v)}
              />
              <SliderRow
                label="Centering"
                value={params.centering}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(v) => updateParam("centering", v)}
              />
              <SliderRow
                label="Damping"
                value={params.damping}
                min={0.5}
                max={0.99}
                step={0.01}
                onChange={(v) => updateParam("damping", v)}
              />
              <SliderRow
                label="Node size"
                value={params.nodeScale}
                min={0.3}
                max={3}
                step={0.1}
                onChange={(v) => updateParam("nodeScale", v)}
              />
              <button
                onClick={() => setParams(DEFAULT_SCENE_PARAMS)}
                className="w-full rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-2">
          <GraphLegend />
        </div>

        {!selected && (
          <p className="text-[10px] text-neutral-500">
            Click any asset to load its relationships.
          </p>
        )}
        {relError && (
          <div className="rounded-lg border-2 border-white/70 px-2.5 py-2 text-[11px] font-medium text-white">
            {relError}
          </div>
        )}
      </div>

      {hoveredId && !selected && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-lg border border-neutral-800 bg-black/80 px-3 py-2 text-xs text-neutral-300 backdrop-blur">
          {nodes.find((n) => n.id === hoveredId)?.name}
        </div>
      )}

      {/* Detail drawer, matching the app's existing overlay pattern */}
      {selected && (
        <div className="absolute inset-y-0 right-0 flex w-[380px] max-w-[85vw] flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-6 dark:border-neutral-800">
            <span className="text-sm font-bold tracking-tight text-black dark:text-white">
              Asset detail
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailPanel
              asset={selected}
              allAssets={pageAssets}
              onManageCapability={onManageCapability}
              onAssetUpdated={onAssetUpdated} // add
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Explore mode (Registry asset browser + 3D graph) ──────────────

function ExploreView({
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

  const inputCls =
    "h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black text-black dark:text-white">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-black dark:text-white">
            Maicore Registry
          </span>
          <span className="mx-1 h-3.5 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            v1.0.0
          </span>
        </div>
        <div className="flex items-center gap-3">
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
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800">
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
        <main className="flex-1 overflow-hidden">
          {viewMode === "list" ? (
            selected ? (
              <DetailPanel
                asset={selected}
                allAssets={assets}
                onManageCapability={onManageCapability}
                onAssetUpdated={applyAssetUpdate}
              />
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

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "all" && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");

  return q ? `?${q}` : "";
}

// ─── Documentation tab (new) — Registry's markdown docs for a capability ──
//
// A capability's asset is found by matching feature_code === registry
// asset.code among the capability-typed assets loaded once at the workspace
// level (see RegistryCapabilityProjector on the backend for how that row
// gets there). Documents are scoped to one version at a time.

type RegistryVersion = {
  id: string;
  asset_id: string;
  version: string;
  status: string;
  released_at: string | null;
};

function DocumentationPanel({
  featureCode,
  registryAssets,
  onOpenInExplorer,
}: {
  featureCode: string;
  registryAssets: Asset[];
  onOpenInExplorer: (assetId: string) => void;
}) {
  const asset = registryAssets.find((a) => a.code === featureCode) ?? null;
  const qc = useQueryClient();
  const isDark = useIsDarkMode();

  const [versionId, setVersionId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"view" | "edit" | "new">("view");
  const [draft, setDraft] = useState({
    category: "",
    title: "",
    slug: "",
    content: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [newCategory, setNewCategory] = useState({
    code: "",
    display_name: "",
    description: "",
  });

  const versionsQuery = useQuery({
    queryKey: ["registry-versions", asset?.id],
    queryFn: () =>
      apiFetch<{ data: RegistryVersion[] }>(`/assets/${asset!.id}/versions`),
    enabled: !!asset,
  });
  const versions = versionsQuery.data?.data ?? [];

  useEffect(() => {
    if (!versionId && versions.length > 0) {
      const latest = [...versions].sort((a, b) =>
        (b.released_at ?? "").localeCompare(a.released_at ?? ""),
      )[0];
      setVersionId(latest.id);
    }
  }, [versions, versionId]);

  const categoriesQuery = useQuery({
    queryKey: ["doc-categories"],
    queryFn: () => apiFetch<{ data: DocCategory[] }>("/doc-categories"),
  });
  const categories = categoriesQuery.data?.data ?? [];

  const docsQuery = useQuery({
    queryKey: ["registry-documents", asset?.id, versionId, activeCategory],
    queryFn: () =>
      apiFetch<{ data: RegistryDocument[] }>(
        `/assets/${asset!.id}/versions/${versionId}/documents${
          activeCategory !== "all" ? `?category=${activeCategory}` : ""
        }`,
      ),
    enabled: !!asset && !!versionId,
  });
  const documents = docsQuery.data?.data ?? [];

  const activeDocQuery = useQuery({
    queryKey: ["registry-document", asset?.id, versionId, activeDocId],
    queryFn: () =>
      apiFetch<{ data: RegistryDocument }>(
        `/assets/${asset!.id}/versions/${versionId}/documents/${activeDocId}`,
      ),
    enabled: !!asset && !!versionId && !!activeDocId,
  });
  const activeDoc = activeDocQuery.data?.data ?? null;

  const invalidateDocs = () =>
    qc.invalidateQueries({
      queryKey: ["registry-documents", asset?.id, versionId],
    });

  const createDoc = useMutation({
    mutationFn: () =>
      apiFetch<{ data: RegistryDocument }>(
        `/assets/${asset!.id}/versions/${versionId}/documents`,
        "POST",
        draft,
      ),
    onSuccess: (r) => {
      setMsg("Document created.");
      setPanelMode("view");
      setActiveDocId(r.data.id);
      invalidateDocs();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const updateDoc = useMutation({
    mutationFn: () =>
      apiFetch<{ data: RegistryDocument }>(
        `/assets/${asset!.id}/versions/${versionId}/documents/${activeDocId}`,
        "PATCH",
        {
          title: draft.title,
          content: draft.content,
          category: draft.category,
        },
      ),
    onSuccess: () => {
      setMsg("Saved.");
      setPanelMode("view");
      invalidateDocs();
      qc.invalidateQueries({
        queryKey: ["registry-document", asset?.id, versionId, activeDocId],
      });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: () =>
      apiFetch(
        `/assets/${asset!.id}/versions/${versionId}/documents/${activeDocId}`,
        "DELETE",
      ),
    onSuccess: () => {
      setMsg("Deleted.");
      setActiveDocId(null);
      invalidateDocs();
    },
    onError: (e: any) => setMsg(e.message),
  });

  const createCategory = useMutation({
    mutationFn: () =>
      apiFetch<{ data: DocCategory }>("/doc-categories", "POST", newCategory),
    onSuccess: (r) => {
      setDraft((d) => ({ ...d, category: r.data.code }));
      setNewCategoryMode(false);
      setNewCategory({ code: "", display_name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["doc-categories"] });
    },
    onError: (e: any) => setMsg(e.message),
  });
  console.log("DOC PANEL", {
    featureCode,
    registryLen: registryAssets.length,
    registryCodes: registryAssets.map((a) => a.code),
    match: registryAssets.find((a) => a.code === featureCode),
  });
  if (!asset) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
        <p className="text-sm text-black dark:text-white m-0 mb-1">
          Not registered in Registry yet
        </p>
        <p className="text-[11px] text-neutral-400 m-0">
          Run <code>php artisan platform:sync-capabilities</code> for manifest
          capabilities, or save this custom capability again — either one
          registers it as a Registry asset, which is what documents attach to.
        </p>
      </div>
    );
  }

  const byCategory = (() => {
    const g: Record<string, RegistryDocument[]> = {};
    for (const d of documents) {
      const key = d.category?.code ?? "uncategorized";
      (g[key] ??= []).push(d);
    }
    return Object.entries(g);
  })();

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={versionId ?? ""}
            onChange={(e) => {
              setVersionId(e.target.value);
              setActiveDocId(null);
              setPanelMode("view");
            }}
            className="px-2 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} {v.status !== "active" ? `(${v.status})` : ""}
              </option>
            ))}
          </select>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenInExplorer(asset.id)}
            className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
          >
            View in Registry graph →
          </button>
          <button
            onClick={() => {
              setDraft({
                category: categories[0]?.code ?? "",
                title: "",
                slug: "",
                content: "",
              });
              setActiveDocId(null);
              setPanelMode("new");
            }}
            disabled={!versionId}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            + New document
          </button>
        </div>
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mb-2 m-0">{msg}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* doc list */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-[420px] overflow-y-auto">
          {docsQuery.isLoading ? (
            <p className="text-xs text-neutral-400 p-3 m-0">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-xs text-neutral-400 p-3 m-0">
              No documents yet.
            </p>
          ) : (
            byCategory.map(([catCode, docs]) => (
              <div key={catCode}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 px-3 pt-2 pb-1 m-0">
                  {docs[0]?.category?.display_name ?? catCode}
                </p>
                {docs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setActiveDocId(d.id);
                      setPanelMode("view");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs border-t border-neutral-100 dark:border-neutral-900 ${
                      d.id === activeDocId
                        ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
                        : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                    }`}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* content pane */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 min-h-[300px]">
          {panelMode === "new" || panelMode === "edit" ? (
            <div className="space-y-2">
              {panelMode === "new" && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!newCategoryMode ? (
                      <>
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              category: e.target.value,
                            }))
                          }
                          className="px-2 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                        >
                          {categories.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.display_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setNewCategoryMode(true)}
                          className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
                        >
                          + new category
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          value={newCategory.code}
                          onChange={(e) =>
                            setNewCategory((c) => ({
                              ...c,
                              code: e.target.value,
                            }))
                          }
                          placeholder="code"
                          className="px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white w-24"
                        />
                        <input
                          value={newCategory.display_name}
                          onChange={(e) =>
                            setNewCategory((c) => ({
                              ...c,
                              display_name: e.target.value,
                            }))
                          }
                          placeholder="Display name"
                          className="px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
                        />
                        <button
                          onClick={() => createCategory.mutate()}
                          disabled={
                            !newCategory.code || !newCategory.display_name
                          }
                          className="text-[11px] px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setNewCategoryMode(false)}
                          className="text-[11px] text-neutral-400"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, title: e.target.value }))
                    }
                    placeholder="Title"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                  />
                  <input
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, slug: e.target.value }))
                    }
                    placeholder="slug (e.g. architecture-overview)"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                  />
                </>
              )}
              {panelMode === "edit" && (
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                />
              )}
              <div data-color-mode={isDark ? "dark" : "light"}>
                <MDEditor
                  value={draft.content}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, content: v ?? "" }))
                  }
                  height={360}
                  preview="live"
                  visibleDragbar={false}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    panelMode === "new"
                      ? createDoc.mutate()
                      : updateDoc.mutate()
                  }
                  disabled={
                    !draft.title ||
                    !draft.content ||
                    (panelMode === "new" && (!draft.slug || !draft.category)) ||
                    createDoc.isPending ||
                    updateDoc.isPending
                  }
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => setPanelMode("view")}
                  className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : activeDoc ? (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white m-0">
                    {activeDoc.title}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-400 m-0">
                    {activeDoc.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setDraft({
                        category: activeDoc.category?.code ?? "",
                        title: activeDoc.title,
                        slug: activeDoc.slug,
                        content: activeDoc.content ?? "",
                      });
                      setPanelMode("edit");
                    }}
                    className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${activeDoc.title}"?`))
                        deleteDoc.mutate();
                    }}
                    className="text-[11px] text-amber-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div data-color-mode={isDark ? "dark" : "light"}>
                <MDEditor.Markdown
                  source={activeDoc.content ?? ""}
                  style={{ padding: "0.75rem", borderRadius: "0.5rem" }}
                  className="max-h-[420px] overflow-y-auto border border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 m-0">
              Select a document, or create a new one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Manage mode (capability RBAC + documentation) ─────────────────

type CapabilityTab = "containers" | "permissions" | "documentation" | "about";

function CapabilityDetail({
  cap,
  meta,
  registryAssets,
  onOpenInExplorer,
}: {
  cap: Capability;
  meta: CatalogEntry | null;
  registryAssets: Asset[];
  onOpenInExplorer: (assetId: string) => void;
}) {
  const [tab, setTab] = useState<CapabilityTab>("containers");
  const isCustom = meta?.origin === "custom";

  useEffect(() => {
    setTab("containers");
  }, [cap.code]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="text-base font-semibold text-black dark:text-white m-0">
            {meta?.display_name ?? cap.display_name}
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
            {cap.code}
          </span>
          {meta?.tier && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
              {meta.tier}
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              isCustom
                ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
            }`}
            title={
              isCustom
                ? "Created in the UI. Editable here; sync never touches it."
                : "Defined by a code manifest. Read-only here; edit the manifest and re-sync."
            }
          >
            {isCustom ? "custom" : "manifest"}
          </span>
        </div>
        {(meta?.description ?? cap.description) && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
            {meta?.description ?? cap.description}
          </p>
        )}
        {!isCustom && (
          <p className="text-[11px] text-neutral-400 mt-1 m-0">
            This capability is defined in code. Its permissions and roles are
            managed by its manifest — change the manifest and re-sync to edit
            them. Its documentation can still be edited here.
          </p>
        )}
      </div>

      <div className="flex gap-1 mb-4">
        {(["containers", "permissions", "documentation", "about"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                tab === t
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 hover:text-black dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ),
        )}
      </div>

      {tab === "containers" && <MapPanel cap={cap} />}
      {tab === "permissions" && (
        <PermissionsPanel cap={cap} isCustom={isCustom} />
      )}
      {tab === "documentation" && (
        <DocumentationPanel
          featureCode={cap.code}
          registryAssets={registryAssets}
          onOpenInExplorer={onOpenInExplorer}
        />
      )}
      {tab === "about" && <AboutPanel cap={cap} meta={meta} />}
    </div>
  );
}

/* ── containers / mapping ─────────────────────────────────────────── */

function MapPanel({ cap }: { cap: Capability }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [mode, setMode] = useState<"role_required" | "open_to_members">(
    "role_required",
  );
  const [msg, setMsg] = useState<string | null>(null);

  const mappingsQuery = useQuery({
    queryKey: ["capability-containers", cap.code],
    queryFn: () => api("GET", `/authority/capabilities/${cap.code}/containers`),
  });
  const containersQuery = useQuery({
    queryKey: ["containers"],
    queryFn: () => api("GET", "/hierarchy/containers"),
    enabled: picking,
  });

  const mappings: Mapping[] = Array.isArray(mappingsQuery.data)
    ? mappingsQuery.data
    : [];
  const allContainers: Container[] = Array.isArray(containersQuery.data)
    ? containersQuery.data
    : (containersQuery.data?.data ?? []);
  const alreadyMapped = new Set(mappings.map((m) => m.container_id));
  const available = allContainers.filter((c) => !alreadyMapped.has(c.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["capability-containers", cap.code] });
    qc.invalidateQueries({ queryKey: ["capabilities"] });
  };

  const map = useMutation({
    mutationFn: () =>
      api("POST", `/authority/capabilities/${cap.code}/containers`, {
        container_ids: chosen,
        access_mode: mode,
      }),
    onSuccess: (r: any) => {
      setMsg(`Enabled for ${r?.mapped ?? chosen.length} container(s).`);
      setChosen([]);
      setPicking(false);
      invalidate();
    },
    onError: (e: any) => setMsg(e.errors?.code?.[0] ?? e.message),
  });

  const update = useMutation({
    mutationFn: (v: { containerId: string; patch: Record<string, unknown> }) =>
      api(
        "PATCH",
        `/authority/capabilities/${cap.code}/containers/${v.containerId}`,
        v.patch,
      ),
    onSuccess: () => {
      setMsg(null);
      invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const unmap = useMutation({
    mutationFn: (containerId: string) =>
      api(
        "DELETE",
        `/authority/capabilities/${cap.code}/containers/${containerId}`,
      ),
    onSuccess: () => {
      setMsg(
        "Disabled. Existing data is untouched — only access is withdrawn.",
      );
      invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div>
      <div className="mb-4">
        {!picking ? (
          <button
            onClick={() => setPicking(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + Enable for containers
          </button>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-black dark:text-white m-0">
                Choose containers
              </p>
              <button
                onClick={() => {
                  setPicking(false);
                  setChosen([]);
                }}
                className="text-xs text-neutral-400"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-100 dark:border-neutral-900 mb-2">
              {containersQuery.isLoading ? (
                <p className="text-xs text-neutral-400 p-3 m-0">Loading…</p>
              ) : available.length === 0 ? (
                <p className="text-xs text-neutral-400 p-3 m-0">
                  Every container already has this capability.
                </p>
              ) : (
                available.map((c, i) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                      i > 0
                        ? "border-t border-neutral-100 dark:border-neutral-900"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(c.id)}
                      onChange={(e) =>
                        setChosen((prev) =>
                          e.target.checked
                            ? [...prev, c.id]
                            : prev.filter((x) => x !== c.id),
                        )
                      }
                    />
                    <span className="text-sm text-black dark:text-white">
                      {c.display_name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {c.code}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              >
                <option value="role_required">Role required</option>
                <option value="open_to_members">Open to members</option>
              </select>
              <button
                onClick={() => chosen.length && map.mutate()}
                disabled={map.isPending || chosen.length === 0}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                Enable for {chosen.length || "…"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2 mb-0">
              <strong>Open to members</strong> grants every member of the
              container this capability's permissions without a role. Use it
              deliberately.
            </p>
          </div>
        )}
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mb-3 m-0">{msg}</p>}

      {mappingsQuery.isLoading ? (
        <p className="text-sm text-neutral-400">Loading containers…</p>
      ) : mappings.length === 0 ? (
        <p className="text-sm text-neutral-400">Not enabled anywhere yet.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {mappings.map((m, i) => (
            <div
              key={m.container_id}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              } ${m.enabled ? "" : "opacity-50"}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-black dark:text-white m-0 truncate">
                  {m.container_display_name}
                </p>
                <p className="text-[10px] font-mono text-neutral-400 m-0 truncate">
                  {m.container_code}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={m.access_mode}
                  onChange={(e) =>
                    update.mutate({
                      containerId: m.container_id,
                      patch: { access_mode: e.target.value },
                    })
                  }
                  className="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                >
                  <option value="role_required">Role required</option>
                  <option value="open_to_members">Open</option>
                </select>
                <button
                  onClick={() =>
                    update.mutate({
                      containerId: m.container_id,
                      patch: { enabled: !m.enabled },
                    })
                  }
                  className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  {m.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => unmap.mutate(m.container_id)}
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── permissions ──────────────────────────────────────────────────── */

function PermissionsPanel({
  cap,
  isCustom,
}: {
  cap: Capability;
  isCustom: boolean;
}) {
  const byResource = useMemo(() => {
    const g: Record<string, Capability["permissions"]> = {};
    for (const p of cap.permissions) (g[p.resource_code] ??= []).push(p);
    return Object.entries(g);
  }, [cap.permissions]);

  return (
    <div className="space-y-4">
      {isCustom && (
        <p className="text-[11px] text-blue-600 dark:text-blue-300 m-0">
          This is a custom capability — you can add resources and roles to it
          via the API. Manifest capabilities are read-only here.
        </p>
      )}
      {byResource.map(([resource, perms]) => (
        <div
          key={resource}
          className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        >
          <p className="text-xs font-semibold text-black dark:text-white m-0 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 font-mono">
            {resource}
          </p>
          <div className="flex flex-wrap gap-1.5 p-3">
            {perms.map((p) => (
              <span
                key={p.id}
                title={p.code}
                className="text-[11px] px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
              >
                {p.action_code}
              </span>
            ))}
          </div>
        </div>
      ))}

      {cap.roles.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <p className="text-xs font-semibold text-black dark:text-white m-0 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
            Roles
          </p>
          {cap.roles.map((r, i) => (
            <div
              key={r.id}
              className={`px-4 py-3 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-black dark:text-white">
                  {r.display_name}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {r.code}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                {r.permissions.length} permission
                {r.permissions.length === 1 ? "" : "s"}
                {r.permissions.length === 0 && (
                  <span className="text-amber-600">
                    {" "}
                    — grants nothing; check the manifest and re-sync
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── about / taxonomy ─────────────────────────────────────────────── */

function AboutPanel({ meta }: { cap: Capability; meta: CatalogEntry | null }) {
  if (!meta) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <p className="text-sm text-black dark:text-white m-0 mb-1">
          Not yet described
        </p>
        <p className="text-[11px] text-neutral-400 m-0">
          This capability's manifest doesn't implement{" "}
          <code>DescribesCapability</code>, so it has no family, industries or
          documented coupling. It works normally — it just won't appear in
          filtered discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <Row
          label="Origin"
          value={
            meta.origin === "custom" ? "Custom (UI-created)" : "Manifest (code)"
          }
        />
        <Row
          label="Family"
          value={meta.family?.display_name ?? "Unclassified"}
        />
        <Row label="Tier" value={meta.tier} />
        <Row
          label="Interface"
          value={meta.has_frontend ? "Has a screen" : "Backend only"}
        />
        <Row
          label="Industries"
          value={
            meta.is_universal
              ? "Universal — offered to every industry"
              : meta.industries.map((i) => i.display_name).join(", ") || "—"
          }
        />
        {meta.tags.length > 0 && (
          <Row label="Tags" value={meta.tags.join(", ")} />
        )}
      </div>

      {meta.internal_uses.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="text-xs font-semibold text-black dark:text-white m-0 mb-1">
            Uses internally
          </p>
          <p className="text-[11px] text-neutral-400 m-0 mb-3">
            Documented implementation coupling. Nothing here is enforced —
            enabling this capability does not require or enable the others.
          </p>
          <ul className="m-0 pl-4 space-y-1.5">
            {meta.internal_uses.map((u) => (
              <li key={u.feature_code} className="text-[11px] text-neutral-500">
                <span className="font-mono text-neutral-600 dark:text-neutral-300">
                  {u.feature_code}
                </span>
                {!u.optional && (
                  <span className="text-amber-600 font-semibold">
                    {" "}
                    (required by code)
                  </span>
                )}
                <br />
                {u.nature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="text-[11px] text-neutral-400 w-24 shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-neutral-700 dark:text-neutral-300">
        {value}
      </span>
    </div>
  );
}

function CapabilityManagerView({
  registryAssets,
  initialCode,
  onOpenInExplorer,
}: {
  registryAssets: Asset[];
  initialCode: string | null;
  onOpenInExplorer: (assetId: string) => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(initialCode);
  const [family, setFamily] = useState("");
  const [industry, setIndustry] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const capsQuery = useQuery({
    queryKey: ["capabilities"],
    queryFn: () => api("GET", "/authority/capabilities"),
  });
  const catalogQuery = useQuery({
    queryKey: ["catalog", "capabilities"],
    queryFn: () => api("GET", "/authority/catalog/capabilities"),
  });
  const familiesQuery = useQuery({
    queryKey: ["catalog", "families"],
    queryFn: () => api("GET", "/authority/catalog/families"),
  });
  const industriesQuery = useQuery({
    queryKey: ["catalog", "industries"],
    queryFn: () => api("GET", "/authority/catalog/industries"),
  });

  const capabilities: Capability[] = useMemo(
    () => (Array.isArray(capsQuery.data) ? capsQuery.data : []),
    [capsQuery.data],
  );
  const catalog: CatalogEntry[] = useMemo(
    () => (Array.isArray(catalogQuery.data) ? catalogQuery.data : []),
    [catalogQuery.data],
  );

  const catalogByCode = useMemo(() => {
    const m: Record<string, CatalogEntry> = {};
    for (const c of catalog) m[c.feature_code] = c;
    return m;
  }, [catalog]);

  const filtered = useMemo(() => {
    return capabilities.filter((cap) => {
      const meta = catalogByCode[cap.code];
      if (family && meta?.family?.code !== family) return false;
      if (industry) {
        const universal = meta?.is_universal ?? true;
        const listed =
          meta?.industries?.some((i) => i.code === industry) ?? false;
        if (!universal && !listed) return false;
      }
      if (search) {
        const t = search.toLowerCase();
        const hay = [
          cap.code,
          cap.display_name,
          cap.description ?? "",
          ...(meta?.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [capabilities, catalogByCode, family, industry, search]);

  const grouped = useMemo(() => {
    const groups: Record<
      string,
      { label: string; icon: string | null; items: Capability[] }
    > = {};
    for (const cap of filtered) {
      const meta = catalogByCode[cap.code];
      const key = meta?.family?.code ?? "~unclassified";
      if (!groups[key]) {
        groups[key] = {
          label: meta?.family?.display_name ?? "Unclassified",
          icon: meta?.family?.icon ?? null,
          items: [],
        };
      }
      groups[key].items.push(cap);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, catalogByCode]);

  const activeCap = capabilities.find((c) => c.code === selected) ?? null;
  const activeMeta = selected ? catalogByCode[selected] : null;

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-black dark:text-white m-0">
            Capability Management
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mt-1">
            License capabilities to containers. Enabling a capability makes its
            permissions grantable there — it does not grant anything by itself.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="shrink-0 px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          + New capability
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search capabilities…"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white min-w-[220px]"
        />
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="">All families</option>
          {(familiesQuery.data ?? []).map((f: any) => (
            <option key={f.code} value={f.code}>
              {f.icon ? `${f.icon} ` : ""}
              {f.display_name}
            </option>
          ))}
        </select>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="">All industries</option>
          {(industriesQuery.data ?? []).map((i: any) => (
            <option key={i.code} value={i.code}>
              {i.display_name}
            </option>
          ))}
        </select>
        {(family || industry || search) && (
          <button
            onClick={() => {
              setFamily("");
              setIndustry("");
              setSearch("");
            }}
            className="px-3 py-2 text-xs text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* list */}
        <div>
          {capsQuery.isLoading ? (
            <p className="text-sm text-neutral-400">Loading capabilities…</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-neutral-400">No capabilities match.</p>
          ) : (
            grouped.map(([key, group]) => (
              <div key={key} className="mb-5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                  {group.icon ? `${group.icon} ` : ""}
                  {group.label}
                </p>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  {group.items.map((cap, i) => {
                    const meta = catalogByCode[cap.code];
                    const on = cap.code === selected;
                    const isCustom = meta?.origin === "custom";

                    return (
                      <button
                        key={cap.code}
                        onClick={() => setSelected(cap.code)}
                        className={`w-full text-left px-3 py-2.5 transition ${
                          i > 0
                            ? "border-t border-neutral-200 dark:border-neutral-800"
                            : ""
                        } ${
                          on
                            ? "bg-neutral-100 dark:bg-neutral-900"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-black dark:text-white truncate">
                            {meta?.display_name ?? cap.display_name}
                          </span>
                          <span className="text-[10px] text-neutral-400 shrink-0">
                            {cap.container_count} container
                            {cap.container_count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-neutral-400 truncate">
                            {cap.code}
                          </span>
                          {isCustom && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                              custom
                            </span>
                          )}
                          {meta && !meta.has_frontend && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                              no UI
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* detail */}
        <div>
          {!activeCap ? (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
              <p className="text-sm text-neutral-400 m-0">
                Select a capability to see its permissions, documentation, and
                which containers hold it.
              </p>
            </div>
          ) : (
            <CapabilityDetail
              cap={activeCap}
              meta={activeMeta}
              registryAssets={registryAssets}
              onOpenInExplorer={onOpenInExplorer}
            />
          )}
        </div>
      </div>

      {creating && (
        <CreateCapabilityModal
          onClose={() => setCreating(false)}
          onCreated={(created?: { code?: string }) => {
            qc.invalidateQueries({ queryKey: ["capabilities"] });
            qc.invalidateQueries({ queryKey: ["catalog", "capabilities"] });
            qc.invalidateQueries({
              queryKey: ["registry-assets", "capability"],
            });
            if (created?.code) setSelected(created.code);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Top-level workspace ────────────────────────────────────────────

type WorkspaceMode = "manage" | "explore";

export default function CapabilityRegistryWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("manage");
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
  const [pendingCapabilityCode, setPendingCapabilityCode] = useState<
    string | null
  >(null);

  // Loaded once, shared by the Documentation tab everywhere it's needed —
  // this is the join between "capability" (Authority) and "asset" (Registry),
  // done client-side by feature_code === code, same as the projector does
  // server-side.
  const registryCapabilitiesQuery = useQuery({
    queryKey: ["registry-assets", "capability"],
    queryFn: () =>
      apiFetch<{ data: Asset[] }>("/assets?asset_type=capability&per_page=100"),
  });
  const registryAssets = registryCapabilitiesQuery.data?.data ?? [];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black text-black dark:text-white">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-tight text-black dark:text-white">
            Capabilities & Registry
          </span>
          <span className="mx-1 h-3.5 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            {mode === "manage"
              ? "License capabilities, manage permissions, document them"
              : "Browse every Registry asset and its relationships"}
          </span>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
          <button
            onClick={() => setMode("manage")}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mode === "manage"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
            }`}
          >
            Manage
          </button>
          <button
            onClick={() => setMode("explore")}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mode === "explore"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
            }`}
          >
            Explore graph
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "manage" ? (
          <div className="h-full overflow-y-auto">
            <CapabilityManagerView
              registryAssets={registryAssets}
              initialCode={pendingCapabilityCode}
              onOpenInExplorer={(assetId) => {
                setPendingAssetId(assetId);
                setMode("explore");
              }}
            />
          </div>
        ) : (
          <ExploreView
            initialSelectId={pendingAssetId}
            onManageCapability={(code) => {
              setPendingCapabilityCode(code);
              setMode("manage");
            }}
          />
        )}
      </div>
    </div>
  );
}
