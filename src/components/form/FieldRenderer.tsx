import type { FormField } from "../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * One question, rendered as its actual input control. `value` for a
 * `document` field is a browser `File` object (or undefined) — never
 * a string — the caller (FormFillForm) is responsible for separating
 * document-file values out from the rest of the answers before
 * choosing `submitResponse` vs `submitResponseWithFiles`.
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {field.help_text}
        </p>
      )}

      {field.type === "short_text" && (
        <input
          className={inputClass}
          value={(value as string) ?? ""}
          maxLength={field.config.max_length}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "long_text" && (
        <textarea
          className={inputClass}
          rows={4}
          value={(value as string) ?? ""}
          maxLength={field.config.max_length}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "single_choice" && (
        <div className="flex flex-col gap-1.5">
          {(field.config.choices ?? []).map((choice) => (
            <label key={choice.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                checked={value === choice.id}
                onChange={() => onChange(choice.id)}
              />
              {choice.label}
            </label>
          ))}
        </div>
      )}

      {field.type === "multiple_choice" &&
        (() => {
          const selected = Array.isArray(value) ? (value as string[]) : [];
          return (
            <div className="flex flex-col gap-1.5">
              {(field.config.choices ?? []).map((choice) => (
                <label
                  key={choice.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(choice.id)}
                    onChange={(e) => {
                      if (e.target.checked) onChange([...selected, choice.id]);
                      else onChange(selected.filter((id) => id !== choice.id));
                    }}
                  />
                  {choice.label}
                </label>
              ))}
            </div>
          );
        })()}

      {field.type === "number" && (
        <input
          type="number"
          className={inputClass}
          value={value === undefined || value === null ? "" : (value as number)}
          min={field.config.min}
          max={field.config.max}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      )}

      {field.type === "date" && (
        <input
          type="date"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "document" && (
        <input
          type="file"
          className="text-sm"
          onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
        />
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
