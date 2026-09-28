import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import {
  DATE_SLOTS, FLAG_SLOTS, NUMBER_SLOTS, TEXT_SLOTS,
  type AttributeChanges, type FieldSlot, type ItemAttributes, type SlotName, type StandardTextField, type TreeItem,
} from "../../../lib/sdk/domains/inventoryCatalog";
import { StructureSection } from "./StructureSection";
import {
  errorMessage, errorTextClass, expiryClasses, expiryLabel, findNode, formatMoney, inputClass, labelClass,
  primaryButtonClass,
} from "./ui";

const ALL_SLOTS: SlotName[] = [...TEXT_SLOTS, ...NUMBER_SLOTS, ...DATE_SLOTS, ...FLAG_SLOTS];

const TEXT_FIELDS: { key: StandardTextField; label: string; placeholder?: string }[] = [
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Barcode" },
  { key: "unit", label: "Unit", placeholder: "pcs, box, kg…" },
  { key: "brand", label: "Brand" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "batch_number", label: "Batch / lot number" },
];

interface FormState {
  text: Record<StandardTextField, string>;
  manufactured_date: string;
  expiry_date: string;
  tags: string;
  slots: Record<SlotName, string>;
  custom: string;
}

function initialForm(a: ItemAttributes): FormState {
  const text = {} as Record<StandardTextField, string>;
  for (const f of TEXT_FIELDS) text[f.key] = a[f.key] ?? "";
  const slots = {} as Record<SlotName, string>;
  for (const s of ALL_SLOTS) {
    const v = a.slots[s];
    slots[s] = v === undefined ? "" : String(v);
  }
  return {
    text,
    manufactured_date: a.manufactured_date ?? "",
    expiry_date: a.expiry_date ?? "",
    tags: a.tags.join(", "),
    slots,
    custom: Object.keys(a.custom).length > 0 ? JSON.stringify(a.custom, null, 2) : "",
  };
}

/** JSON with sorted keys — Postgres returns object keys in its own order. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Only what actually changed is sent — an untouched field must not be
 * sent, since the server treats a missing key as "leave alone". */
function buildChanges(
  attrs: ItemAttributes,
  form: FormState,
  meta: Map<SlotName, FieldSlot>,
): { changes: AttributeChanges; error: string | null } {
  const changes: AttributeChanges = {};

  for (const { key } of TEXT_FIELDS) {
    const now = form.text[key].trim();
    if (now !== (attrs[key] ?? "")) changes[key] = now === "" ? null : now;
  }
  for (const key of ["manufactured_date", "expiry_date"] as const) {
    const now = form[key].trim();
    if (now !== (attrs[key] ?? "")) changes[key] = now === "" ? null : now;
  }

  const tags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (stable(tags) !== stable(attrs.tags)) changes.tags = tags;

  for (const slot of ALL_SLOTS) {
    const raw = form.slots[slot].trim();
    const original = attrs.slots[slot];
    const type = meta.get(slot)?.type;
    const label = meta.get(slot)?.label ?? slot;

    if (type === "number") {
      if (raw === "") {
        if (original !== undefined) changes[slot] = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n)) return { changes, error: `${label} must be a number.` };
        if (n !== original) changes[slot] = n;
      }
    } else if (type === "flag") {
      const orig = original === undefined ? "" : String(original);
      if (raw !== orig) changes[slot] = raw === "" ? null : raw === "true";
    } else {
      const orig = original === undefined ? "" : String(original);
      if (raw !== orig) changes[slot] = raw === "" ? null : raw;
    }
  }

  if (form.custom.trim() !== "" || Object.keys(attrs.custom).length > 0) {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(form.custom.trim() === "" ? "{}" : form.custom);
    } catch {
      return { changes, error: "Custom data isn't valid JSON yet." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { changes, error: "Custom data must be a JSON object." };
    }
    if (stable(parsed) !== stable(attrs.custom)) changes.custom = parsed as Record<string, unknown>;
  }

  return { changes, error: null };
}

export function ItemDetailsPanel({
  containerId, itemId, tree, onSelect,
}: {
  containerId: string;
  itemId: string;
  tree: TreeItem[];
  onSelect: (id: string) => void;
}) {
  const node = findNode(tree, itemId);

  const attributes = useQuery({
    queryKey: ["inventory-catalog", "attributes", itemId],
    queryFn: () => sdk.inventoryCatalog.getAttributes(itemId),
  });
  const slots = useQuery({
    queryKey: ["inventory-catalog", "slots", containerId],
    queryFn: () => sdk.inventoryCatalog.listFieldSlots(containerId),
  });
  const nesting = useQuery({
    queryKey: ["inventory-catalog", "nesting", itemId],
    queryFn: () => sdk.inventoryCatalog.getNesting(itemId),
  });

  if (!node) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-500">That item is no longer in the catalog.</p>;
  }

  const a = attributes.data;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{node.title}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {node.status}
          </span>
          {a?.expiry_status && a.expiry_status !== "ok" && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${expiryClasses(a.expiry_status)}`}>
              {expiryLabel(a.expiry_status, a.days_until_expiry)}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {node.item_type} · {formatMoney(node.price.total, node.price.currency)}
        </p>
      </header>

      {(attributes.isLoading || slots.isLoading) && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {attributes.isError && <p className="text-sm text-red-600 dark:text-red-400">Couldn't load this item's details.</p>}

      {a && slots.data && (
        <AttributesForm key={`${itemId}:${a.updated_at ?? "new"}`} itemId={itemId} attrs={a} slots={slots.data} />
      )}

      {nesting.data && (
        <StructureSection
          key={`${itemId}:${JSON.stringify(nesting.data.node)}`}
          itemId={itemId}
          item={node}
          tree={tree}
          nesting={nesting.data}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function AttributesForm({ itemId, attrs, slots }: { itemId: string; attrs: ItemAttributes; slots: FieldSlot[] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialForm(attrs));
  const [showAllSlots, setShowAllSlots] = useState(false);

  const meta = new Map<SlotName, FieldSlot>(slots.map((s) => [s.slot, s]));
  const { changes, error } = buildChanges(attrs, form, meta);
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => sdk.inventoryCatalog.updateAttributes(itemId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-catalog"] }),
  });

  // A labelled, active slot — or any slot that already holds a value, so
  // existing data is never hidden just because its label was removed.
  const visibleSlots = slots
    .filter((s) => showAllSlots || (s.defined && s.is_active) || form.slots[s.slot] !== "")
    .sort((x, y) => x.position - y.position || ALL_SLOTS.indexOf(x.slot) - ALL_SLOTS.indexOf(y.slot));
  const hasLabelledSlots = slots.some((s) => s.defined && s.is_active);

  const setText = (key: StandardTextField, v: string) => setForm((f) => ({ ...f, text: { ...f.text, [key]: v } }));
  const setSlot = (slot: SlotName, v: string) => setForm((f) => ({ ...f, slots: { ...f.slots, [slot]: v } }));

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-medium">Details</h3>

      <div className="grid grid-cols-2 gap-3">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label className={labelClass}>{f.label}</label>
            <input className={inputClass} value={form.text[f.key]} placeholder={f.placeholder} onChange={(e) => setText(f.key, e.target.value)} />
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Manufactured</label>
          <input type="date" className={inputClass} value={form.manufactured_date} onChange={(e) => setForm((f) => ({ ...f, manufactured_date: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Expiry date</label>
          <input type="date" className={inputClass} value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className={labelClass}>Tags (comma separated)</label>
          <input className={inputClass} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Your fields</h4>
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
            <input type="checkbox" checked={showAllSlots} onChange={(e) => setShowAllSlots(e.target.checked)} />
            Show all reserved fields
          </label>
        </div>
        {!hasLabelledSlots && !showAllSlots && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            No custom fields are named for this container yet — name them in “Field labels” (a pharmacy might add “Dosage form”).
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {visibleSlots.map((s) => (
            <SlotInput key={s.slot} slot={s} value={form.slots[s.slot]} onChange={(v) => setSlot(s.slot, v)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <label className={labelClass}>Extra data (JSON object)</label>
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={3}
          spellCheck={false}
          placeholder='{"storage": "keep cool"}'
          value={form.custom}
          onChange={(e) => setForm((f) => ({ ...f, custom: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => save.mutate()} disabled={!dirty || error !== null || save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Saving…" : "Save details"}
        </button>
        {error && <p className={errorTextClass}>{error}</p>}
        {save.isError && <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save.")}</p>}
        {save.isSuccess && !dirty && <p className="text-xs text-neutral-500 dark:text-neutral-500">Saved.</p>}
      </div>
    </section>
  );
}

function SlotInput({ slot, value, onChange }: { slot: FieldSlot; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>
        {slot.label ?? slot.slot}
        {!slot.defined && <span className="ml-1 text-neutral-400 dark:text-neutral-600">({slot.slot})</span>}
      </label>
      {slot.type === "flag" ? (
        <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          className={inputClass}
          type={slot.type === "date" ? "date" : slot.type === "number" ? "number" : "text"}
          step={slot.type === "number" ? "any" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {slot.help_text && <p className="text-[11px] text-neutral-500 dark:text-neutral-500">{slot.help_text}</p>}
    </div>
  );
}
