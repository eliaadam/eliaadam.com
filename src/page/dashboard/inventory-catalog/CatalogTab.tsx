import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Layers, Search } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { ItemWithAttributes, TreeItem } from "../../../lib/sdk/domains/inventoryCatalog";
import { ItemDetailsPanel } from "./ItemDetailsPanel";
import {
  errorMessage, errorTextClass, expiryClasses, formatMoney, inputClass, secondaryButtonClass,
} from "./ui";

/** Hides archived items — but keeps an archived parent that still has
 * visible children, so nothing is orphaned from view. */
function prune(nodes: TreeItem[], showArchived: boolean): TreeItem[] {
  return nodes.flatMap((n) => {
    const children = prune(n.children, showArchived);
    if (n.status === "archived" && !showArchived && children.length === 0) return [];
    return [{ ...n, children }];
  });
}

export function CatalogTab({ containerId }: { containerId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: tree, isLoading, isError } = useQuery({
    queryKey: ["inventory-catalog", "tree", containerId],
    queryFn: () => sdk.inventoryCatalog.getItemTree(containerId),
  });

  const visible = useMemo(() => prune(tree ?? [], showArchived), [tree, showArchived]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col gap-3">
        <LookupBox containerId={containerId} onPick={setSelectedId} />

        <label className="flex w-fit items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>

        {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
        {isError && <p className="text-sm text-red-600 dark:text-red-400">Couldn't load the catalog.</p>}
        {tree && visible.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
            No items yet. Create items in Inventory, then organise them here.
          </p>
        )}

        {visible.length > 0 && (
          <ul className="rounded-lg border border-neutral-200 py-1 dark:border-neutral-800">
            {visible.map((n) => (
              <TreeRows key={n.id} node={n} depth={0} selectedId={selectedId} collapsed={collapsed} onToggle={toggle} onSelect={setSelectedId} />
            ))}
          </ul>
        )}
      </div>

      <div>
        {selectedId && tree ? (
          <ItemDetailsPanel key={selectedId} containerId={containerId} itemId={selectedId} tree={tree} onSelect={setSelectedId} />
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
            Select an item to see and edit its details.
          </p>
        )}
      </div>
    </div>
  );
}

function TreeRows({
  node, depth, selectedId, collapsed, onToggle, onSelect,
}: {
  node: TreeItem;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = !collapsed.has(node.id);
  const selected = node.id === selectedId;

  return (
    <li>
      <div
        className={`flex items-center gap-1.5 py-1.5 pr-3 text-sm ${selected ? "bg-neutral-100 dark:bg-neutral-900" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"}`}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => onToggle(node.id)} className="flex-none text-neutral-400" aria-label={isOpen ? "Collapse" : "Expand"}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px] flex-none" />
        )}
        <button type="button" onClick={() => onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={`truncate ${node.status === "archived" ? "text-neutral-400 line-through dark:text-neutral-600" : ""}`}>{node.title}</span>
          {node.node.is_bundle && <Layers size={12} className="flex-none text-neutral-400" aria-label="Bundle" />}
          {node.node.parent_item_id && node.node.quantity_in_parent !== 1 && (
            <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">×{node.node.quantity_in_parent}</span>
          )}
        </button>
        {node.sku && <span className="hidden flex-none text-[11px] text-neutral-500 sm:inline dark:text-neutral-500">{node.sku}</span>}
        {node.expiry_status && node.expiry_status !== "ok" && (
          <span className={`flex-none rounded-full px-1.5 py-0.5 text-[10px] font-medium ${expiryClasses(node.expiry_status)}`}>
            {node.expiry_status === "expired" ? "expired" : "soon"}
          </span>
        )}
        <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">{formatMoney(node.price.total, node.price.currency)}</span>
      </div>
      {hasChildren && isOpen && (
        <ul>
          {node.children.map((c) => (
            <TreeRows key={c.id} node={c} depth={depth + 1} selectedId={selectedId} collapsed={collapsed} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function LookupBox({ containerId, onPick }: { containerId: string; onPick: (id: string) => void }) {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<ItemWithAttributes[] | null>(null);

  const lookup = useMutation({
    // A scan could be either — try the SKU, and the barcode too. The
    // server returns the union.
    mutationFn: (value: string) => sdk.inventoryCatalog.lookupItems(containerId, { sku: value, barcode: value }),
    onSuccess: setResults,
  });

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) lookup.mutate(code.trim());
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className={`${inputClass} pl-8`} placeholder="Scan or type a SKU / barcode…" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button type="submit" className={secondaryButtonClass} disabled={lookup.isPending}>Find</button>
      </form>
      {lookup.isError && <p className={errorTextClass}>{errorMessage(lookup.error, "Lookup failed.")}</p>}
      {results && results.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-500">Nothing matches that code.</p>}
      {results && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {results.map((r) => (
            <li key={r.item.id}>
              <button type="button" onClick={() => onPick(r.item.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <span className="truncate font-medium">{r.item.title}</span>
                <span className="flex-none text-neutral-500 dark:text-neutral-500">{r.attributes.sku ?? r.attributes.barcode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
