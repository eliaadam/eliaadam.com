import { Plus, Trash2 } from "lucide-react";
import type { Choice, FieldInput, FieldType } from "../../lib/sdk";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  number: "Number",
  date: "Date",
  document: "File upload",
};

function newChoiceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** One field's editor row in the form builder — label, type, required,
 * plus whatever type-specific config that type needs (a choices list
 * for single/multiple choice, min/max for number). Adding an 8th field
 * type on the backend needs a matching case added here too, same as
 * the backend's own field_validation.py extensibility point. */
export function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: FieldInput;
  onChange: (field: FieldInput) => void;
  onRemove: () => void;
}) {
  const choices: Choice[] = field.config?.choices ?? [];

  const updateChoices = (next: Choice[]) => {
    onChange({ ...field, config: { ...field.config, choices: next } });
  };

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <input
            className={`${inputClass} w-full font-medium`}
            placeholder="Question"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={inputClass}
              value={field.type}
              onChange={(e) =>
                onChange({
                  ...field,
                  type: e.target.value as FieldType,
                  config: {},
                })
              }
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={field.required ?? false}
                onChange={(e) =>
                  onChange({ ...field, required: e.target.checked })
                }
              />
              Required
            </label>
          </div>
          <input
            className={`${inputClass} w-full text-xs`}
            placeholder="Help text (optional)"
            value={field.help_text ?? ""}
            onChange={(e) => onChange({ ...field, help_text: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove question"
          className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {(field.type === "single_choice" || field.type === "multiple_choice") && (
        <div className="mt-3 flex flex-col gap-1.5 pl-1">
          {choices.map((choice, i) => (
            <div key={choice.id} className="flex items-center gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder={`Choice ${i + 1}`}
                value={choice.label}
                onChange={(e) => {
                  const next = [...choices];
                  next[i] = { ...choice, label: e.target.value };
                  updateChoices(next);
                }}
              />
              <button
                type="button"
                onClick={() =>
                  updateChoices(choices.filter((_, ci) => ci !== i))
                }
                aria-label="Remove choice"
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateChoices([...choices, { id: newChoiceId(), label: "" }])
            }
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-black dark:hover:text-white"
          >
            <Plus size={12} /> Add choice
          </button>
        </div>
      )}

      {field.type === "number" && (
        <div className="mt-3 flex items-center gap-3 pl-1 text-xs">
          <label className="flex items-center gap-1.5">
            Min
            <input
              type="number"
              className={`${inputClass} w-20`}
              value={field.config?.min ?? ""}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    min:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className="flex items-center gap-1.5">
            Max
            <input
              type="number"
              className={`${inputClass} w-20`}
              value={field.config?.max ?? ""}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    max:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      )}

      {(field.type === "short_text" || field.type === "long_text") && (
        <div className="mt-3 pl-1 text-xs">
          <label className="flex items-center gap-1.5">
            Max length
            <input
              type="number"
              className={`${inputClass} w-24`}
              value={field.config?.max_length ?? ""}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    max_length:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
