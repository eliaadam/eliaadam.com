// src/design-system/components/ui/empty-state.tsx

import * as React from "react";
import { Inbox } from "lucide-react";

import { cn } from "../../design-system/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          [
            "flex min-h-48 flex-col",
            "items-center justify-center",
            "rounded-xl border border-dashed border-border",
            "bg-surface",
            "px-6 py-10",
            "text-center",
          ],
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon ?? <Inbox className="size-6" />}
        </div>

        <h3 className="text-base font-semibold text-foreground">{title}</h3>

        {description && (
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}

        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export { EmptyState };
