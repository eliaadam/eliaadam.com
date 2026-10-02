import { useState } from "react";
import type { ValueType } from "../../lib/sdk/domains/settings";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

interface ValueInputProps {
  valueType: ValueType;
  choices: unknown[] | null;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders the right input for a setting's declared type — a select
 * when `choices` constrains it regardless of type, otherwise a
 * checkbox/number/text/JSON-textarea by `valueType`. Reused for both
 * registry-known settings (type fixed by their definition) and ad-hoc
 * ones (the admin picks the type alongside the key). */
export function ValueInput({ valueType, choices, value, onChange }: ValueInputProps) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (choices && choices.length > 0) {
    return (
      <select
        className={inputClass} value={JSON.stringify(value)}
        onChange={(e) => onChange(JSON.parse(e.target.value))}
      >
        {choices.map((c) => (
          <option key={JSON.stringify(c)} value={JSON.stringify(c)}>{String(c)}</option>
        ))}
      </select>
    );
  }

  if (valueType === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {value ? "true" : "false"}
      </label>
    );
  }

  if (valueType === "number") {
    return (
      <input
        type="number" className={inputClass} value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }

  if (valueType === "json") {
    const onBlur = () => {
      try {
        onChange(JSON.parse(jsonText));
        setJsonError(null);
      } catch {
        setJsonError("Not valid JSON — change wasn't applied.");
      }
    };
    return (
      <div>
        <textarea
          className={`${inputClass} min-h-[5rem] font-mono text-xs`} value={jsonText}
          onChange={(e) => setJsonText(e.target.value)} onBlur={onBlur}
        />
        {jsonError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{jsonError}</p>}
      </div>
    );
  }

  // "string"
  return <input type="text" className={inputClass} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />;
}
