import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Asset, Capability, CatalogEntry } from "./registry/types";
import { CapabilityDetail } from "./CapabilityDetail";
import CreateCapabilityModal from "./CreateCapabilityModal";

export function CapabilityManagerView({
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
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
          className="shrink-0 w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          + New capability
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search capabilities…"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white sm:min-w-[220px]"
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
            className="px-3 py-2 text-xs text-neutral-500 hover:text-black dark:hover:text-white self-start"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* list — hidden on small screens once a capability is selected */}
        <div className={selected ? "hidden lg:block" : "block"}>
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
                        className={`w-full text-left px-3 py-3 sm:py-2.5 transition ${
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
        <div className={selected ? "block" : "hidden lg:block"}>
          {!activeCap ? (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
              <p className="text-sm text-neutral-400 m-0">
                Select a capability to see its permissions, documentation, and
                which containers hold it.
              </p>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelected(null)}
                className="lg:hidden mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
              >
                <span aria-hidden>←</span> Back to capabilities
              </button>
              <CapabilityDetail
                cap={activeCap}
                meta={activeMeta}
                registryAssets={registryAssets}
                onOpenInExplorer={onOpenInExplorer}
              />
            </div>
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
