export function DetailItem({
  label,
  value,
  mono = false,
  onClick,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-neutral-100 dark:border-neutral-900">
      <span className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium flex-shrink-0">
        {label}
      </span>
      {onClick ? (
        <button
          onClick={onClick}
          title={value}
          className={`text-[13px] text-black dark:text-white underline underline-offset-2 text-right max-w-[65%] truncate ${mono ? "font-mono text-xs" : ""}`}
        >
          {value}
        </button>
      ) : (
        <span
          title={value}
          className={`text-[13px] text-black dark:text-white text-right max-w-[65%] truncate ${mono ? "font-mono text-xs" : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
