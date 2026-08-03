export function GraphLegend() {
  return (
    <div className="pointer-events-none flex flex-col gap-1.5 text-[10px] text-neutral-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/90" />
        <span>platform / domain — emphasised</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-neutral-500" />
        <span>other asset types, by tone</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rotate-45 border border-neutral-400" />
        <span>low-poly = off-page / unresolved</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-neutral-400" />
        <span>hollow = deprecated / retired</span>
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-300" /> outgoing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-600" /> incoming
        </span>
      </div>
    </div>
  );
}
