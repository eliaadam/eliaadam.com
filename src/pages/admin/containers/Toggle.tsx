export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${
            checked
              ? "translate-x-[18px] bg-white dark:bg-black"
              : "translate-x-[3px] bg-white dark:bg-black"
          }`}
        />
      </button>
      <span className="text-[13px] text-neutral-700 dark:text-neutral-300 font-medium">
        {label}
      </span>
    </label>
  );
}
