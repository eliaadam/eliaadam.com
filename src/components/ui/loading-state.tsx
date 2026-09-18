// src/design-system/components/ui/loading-state.tsx

import * as React from "react";

import { Spinner } from "./spinner";
import { cn } from "../../design-system/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, label = "Loading...", size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex items-center justify-center gap-3",
          "text-sm text-muted-foreground",
          className,
        )}
        {...props}
      >
        <Spinner size={size} />

        <span>{label}</span>
      </div>
    );
  },
);

LoadingState.displayName = "LoadingState";

export { LoadingState };
