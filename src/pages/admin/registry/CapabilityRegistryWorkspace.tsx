import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { Asset, WorkspaceMode } from "./registry/types";
import { CapabilityManagerView } from "./CapabilityManagerView";
import { ExploreView } from "./ExploreView";

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold tracking-tight text-black dark:text-white">
            Capabilities & Registry
          </span>
          <span className="hidden sm:inline-block mx-1 h-3.5 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="hidden sm:inline text-xs text-neutral-400 dark:text-neutral-600">
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
