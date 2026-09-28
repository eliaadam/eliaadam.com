import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { NestingChanges, NestingDetail, TreeItem } from "../../../lib/sdk/domains/inventoryCatalog";
import {
  descendantIds, errorMessage, errorTextClass, flatten, formatMoney, inputClass, labelClass, primaryButtonClass,
} from "./ui";

export function StructureSection({
  itemId, item, tree, nesting, onSelect,
}: {
  itemId: string;
  item: TreeItem;
  tree: TreeItem[];
  nesting: NestingDetail;
  onSelect: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const node = nesting.node;

  const [parentId, setParentId] = useState(node.parent_item_id ?? "");
  const [quantity, setQuantity] = useState(String(node.quantity_in_parent));
  const [isBundle, setIsBundle] = useState(node.is_bundle);
  const [position, setPosition] = useState(String(node.position));

  // Never offer the item itself or anything beneath it as a parent — the
  // server refuses those too (cycle), this just avoids offering them.
  const blocked = descendantIds(item);
  blocked.add(itemId);
  const options = flatten(tree).filter((f) => !blocked.has(f.item.id));

  const changes: NestingChanges = {};
  let error: string | null = null;
  if ((parentId || null) !== node.parent_item_id) changes.parent_item_id = parentId || null;
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) error = "Quantity must be greater than 0.";
  else if (q !== node.quantity_in_parent) changes.quantity_in_parent = q;
  const pos = Number(position);
  if (!Number.isInteger(pos) || pos < 0) error = "Position must be a whole number, 0 or more.";
  else if (pos !== node.position) changes.position = pos;
  if (isBundle !== node.is_bundle) changes.is_bundle = isBundle;
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => sdk.inventoryCatalog.updateNesting(itemId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-catalog"] }),
  });

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-medium">Structure</h3>

      {nesting.breadcrumb.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-xs text-neutral-500 dark:text-neutral-500">
          {nesting.breadcrumb.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <button type="button" onClick={() => onSelect(b.id)} className="font-medium hover:underline">{b.title}</button>
              <span>/</span>
            </span>
          ))}
          <span className="text-black dark:text-white">{item.title}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className={labelClass}>Nested under</label>
          <select className={inputClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Top level —</option>
            {options.map(({ item: o, depth }) => (
              <option key={o.id} value={o.id}>
                {"\u00a0\u00a0".repeat(depth)}
                {o.title}
                {o.status === "archived" ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </div>
        {parentId && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Quantity in parent</label>
            <input type="number" min="0" step="any" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Order among siblings</label>
          <input type="number" min="0" step="1" className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBundle} onChange={(e) => setIsBundle(e.target.checked)} />
          This is a bundle / package made of the items nested under it
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => save.mutate()} disabled={!dirty || error !== null || save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Saving…" : "Save structure"}
        </button>
        {error && <p className={errorTextClass}>{error}</p>}
        {save.isError && <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save.")}</p>}
      </div>

      {nesting.children.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className={labelClass}>Nested items</p>
          <ul className="flex flex-col gap-1">
            {nesting.children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
                <button type="button" onClick={() => onSelect(c.id)} className="truncate font-medium hover:underline">
                  {c.node.quantity_in_parent !== 1 ? `${c.node.quantity_in_parent} × ` : ""}
                  {c.title}
                </button>
                <span className="flex-none text-neutral-500 dark:text-neutral-500">{formatMoney(c.price.total, c.price.currency)}</span>
              </li>
            ))}
          </ul>
          {nesting.components_total !== null && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Components add up to{" "}
              <span className="font-medium text-black dark:text-white">{formatMoney(nesting.components_total, item.price.currency)}</span>
              {" · "}this bundle is priced at{" "}
              <span className="font-medium text-black dark:text-white">{formatMoney(item.price.total, item.price.currency)}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
