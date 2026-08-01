export default function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-neutral-200 dark:border-neutral-800"
      style={{ padding: "var(--ux-panel-pad, 1rem)" }}
    >
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        {title}
      </p>
      {subtitle && (
        <p className="text-[11px] text-neutral-400 m-0 mb-3">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
