// src/design-system/components/ui/spinner.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          "motion-reduce:animate-none",
          {
            "size-4": size === "sm",
            "size-5": size === "md",
            "size-6": size === "lg",
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Spinner.displayName = "Spinner";

export { Spinner };
