import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { apiFetch } from "./api";
import type { Asset, RelationshipData } from "./registry/types";
import { DetailPanel } from "./DetailPanel";
import { GraphScene } from "./GraphScene";
import { GraphLegend } from "./GraphLegend";
import { SliderRow } from "./SliderRow";
import { useRegistryGraph } from "./useRegistryGraph";
import {
  DEFAULT_SCENE_PARAMS,
  type NodeLabelField,
  type SceneParams,
} from "./types";

export function RegistryGraphView({
  pageAssets,
  selected,
  onSelectId,
  onClearSelection,
  onManageCapability,
  onAssetUpdated,
}: {
  pageAssets: Asset[];
  selected: Asset | null;
  onSelectId: (id: string) => void;
  onClearSelection: () => void;
  onManageCapability?: (featureCode: string) => void;
  onAssetUpdated?: (updated: Asset) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [localGraph, setLocalGraph] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [params, setParams] = useState<SceneParams>(DEFAULT_SCENE_PARAMS);
  const [showSettings, setShowSettings] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

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

      {/* Floating control panel, Obsidian-graph-view style. Collapsible so it
          doesn't eat the whole viewport on small screens. */}
      <div className="pointer-events-auto absolute left-2 top-2 sm:left-4 sm:top-4 w-[calc(100vw-1rem)] sm:w-64 sm:max-w-[17rem] rounded-xl border border-neutral-800 bg-black/80 backdrop-blur">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-300"
        >
          <span>Graph controls</span>
          <span>{panelOpen ? "−" : "+"}</span>
        </button>

        {panelOpen && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3 pt-0">
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
                    updateParam(
                      "nodeLabelField",
                      e.target.value as NodeLabelField,
                    )
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
                      onChange={(e) =>
                        updateParam("fadeEnabled", e.target.checked)
                      }
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
                          updateParam(
                            "fadeNear",
                            Math.min(v, params.fadeFar - 1),
                          )
                        }
                      />
                      <SliderRow
                        label="Fade end distance"
                        value={params.fadeFar}
                        min={10}
                        max={200}
                        step={1}
                        onChange={(v) =>
                          updateParam(
                            "fadeFar",
                            Math.max(v, params.fadeNear + 1),
                          )
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
        )}
      </div>

      {hoveredId && !selected && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-lg border border-neutral-800 bg-black/80 px-3 py-2 text-xs text-neutral-300 backdrop-blur">
          {nodes.find((n) => n.id === hoveredId)?.name}
        </div>
      )}

      {/* Detail drawer, matching the app's existing overlay pattern. Full
          width on phones, fixed width from sm up. */}
      {selected && (
        <div className="absolute inset-y-0 right-0 flex w-full sm:w-[380px] sm:max-w-[85vw] flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 sm:px-6 dark:border-neutral-800">
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
              onAssetUpdated={onAssetUpdated}
            />
          </div>
        </div>
      )}
    </div>
  );
}
