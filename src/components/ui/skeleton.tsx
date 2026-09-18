// src/design-system/components/ui/skeleton.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        [
          "animate-pulse",
          "rounded-md",
          "bg-muted",
          "motion-reduce:animate-none",
        ],
        className,
      )}
      {...props}
    />
  );
});

Skeleton.displayName = "Skeleton";

export { Skeleton };
