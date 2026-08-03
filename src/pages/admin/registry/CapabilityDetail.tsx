import { useEffect, useState } from "react";
import type {
  Asset,
  CapabilityTab,
  Capability,
  CatalogEntry,
} from "./registry/types";
import { MapPanel } from "./MapPanel";
import { PermissionsPanel } from "./PermissionsPanel";
import { DocumentationPanel } from "./DocumentationPanel";
import { AboutPanel } from "./AboutPanel";

export function CapabilityDetail({
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

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {(["containers", "permissions", "documentation", "about"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
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
        <PermissionsPanel cap={cap} isCustom={!!isCustom} />
      )}
      {tab === "documentation" && (
        <DocumentationPanel
          featureCode={cap.code}
          registryAssets={registryAssets}
          onOpenInExplorer={onOpenInExplorer}
        />
      )}
      {tab === "about" && <AboutPanel meta={meta} />}
    </div>
  );
}
