import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { FieldSlot, SlotType } from "../../../lib/sdk/domains/inventoryCatalog";
import {
  dangerButtonClass, errorMessage, errorTextClass, inputClass, primaryButtonClass,
} from "./ui";

const TYPE_LABEL: Record<SlotType, string> = { text: "Text", number: "Number", date: "Date", flag: "Yes / No" };

export function FieldLabelsTab({ containerId }: { containerId: string }) {
  const { data: slots, isLoading, error } = useQuery({
    queryKey: ["inventory-catalog", "slots", containerId],
    queryFn: () => sdk.inventoryCatalog.listFieldSlots(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Every item has a set of reserved fields. Name the ones your business uses and they appear on each item's form
        with your label — a pharmacy might call a text field “Dosage form” and a date “Opened on”; a salon might call a
        number “Duration (min)”. Unnamed fields stay hidden.
      </p>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(error, "Couldn't load the fields.")}</p>}

      {slots && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {slots.map((s) => (
            <SlotRow key={`${s.slot}:${s.label ?? ""}:${s.help_text}:${s.is_active}:${s.position}`} containerId={containerId} slot={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SlotRow({ containerId, slot }: { containerId: string; slot: FieldSlot }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(slot.label ?? "");
  const [helpText, setHelpText] = useState(slot.help_text);
  const [isActive, setIsActive] = useState(slot.is_active);
  const [position, setPosition] = useState(String(slot.position));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory-catalog", "slots", containerId] });
  const pos = Number(position);
  const posValid = Number.isInteger(pos) && pos >= 0;

  const save = useMutation({
    mutationFn: () =>
      sdk.inventoryCatalog.saveFieldDefinition(containerId, slot.slot, {
        label: label.trim(),
        help_text: helpText,
        is_active: isActive,
        position: pos,
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => sdk.inventoryCatalog.removeFieldDefinition(containerId, slot.slot),
    onSuccess: refresh,
  });

  const changed =
    label.trim() !== (slot.label ?? "") || helpText !== slot.help_text || isActive !== slot.is_active || pos !== slot.position;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-neutral-500 dark:text-neutral-500">{slot.slot}</span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">{TYPE_LABEL[slot.type]}</span>
        {!slot.defined && <span className="text-neutral-400 dark:text-neutral-600">not named</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_5rem_auto] items-center gap-2">
        <input className={inputClass} placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={inputClass} placeholder="Hint (optional)" value={helpText} onChange={(e) => setHelpText(e.target.value)} />
        <input className={inputClass} type="number" min="0" step="1" title="Order" value={position} onChange={(e) => setPosition(e.target.value)} />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Shown
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => save.mutate()} disabled={!label.trim() || !posValid || !changed || save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Saving…" : slot.defined ? "Save" : "Name this field"}
        </button>
        {slot.defined && (
          <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className={dangerButtonClass}>
            Remove label
          </button>
        )}
        {(save.isError || remove.isError) && <p className={errorTextClass}>{errorMessage(save.error ?? remove.error, "Couldn't save.")}</p>}
      </div>
    </li>
  );
}
