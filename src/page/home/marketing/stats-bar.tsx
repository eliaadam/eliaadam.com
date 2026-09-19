// src/components/marketing/stats-bar.tsx

import { STATS } from "../../../data/marketing";
import { cn } from "../../../design-system/lib/utils";

export function StatsBar() {
  return (
    <div className="border-y border-border">
      <div className="ds-container">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "px-4 py-6 sm:px-6",
                index > 0 && "border-l border-border",
              )}
            >
              <div className="font-mono text-xl font-medium tracking-tight sm:text-2xl">
                {stat.value}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
