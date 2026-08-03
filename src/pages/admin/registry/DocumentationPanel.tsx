import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { apiFetch } from "./api";
import type { Asset, DocCategory, RegistryDocument, RegistryVersion } from "./registry/types";
import { useIsDarkMode } from "./useIsDarkMode";

// A capability's asset is found by matching feature_code === registry
// asset.code among the capability-typed assets loaded once at the workspace
// level (see RegistryCapabilityProjector on the backend for how that row
// gets there). Documents are scoped to one version at a time.

export function DocumentationPanel({
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
        <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex items-center gap-3 flex-wrap">
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
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-56 md:max-h-[420px] overflow-y-auto">
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
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 min-h-[300px]">
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
                  height={280}
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
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black dark:text-white m-0 truncate">
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
