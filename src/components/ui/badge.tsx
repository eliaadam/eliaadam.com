// src/design-system/components/ui/badge.tsx

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../design-system/lib/utils";

 

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "w-fit shrink-0",
    "rounded-full",
    "border border-transparent",
    "px-2.5 py-0.5",
    "text-xs font-medium",
    "leading-5",
    "whitespace-nowrap",
    "transition-colors duration-200",
    "motion-reduce:transition-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground",
        ],
        accent: [
          "bg-accent text-accent-foreground",
        ],
        success: [
          "bg-success text-success-foreground",
        ],
        warning: [
          "bg-warning text-warning-foreground",
        ],
        error: [
          "bg-error text-error-foreground",
        ],
        info: [
          "bg-info text-info-foreground",
        ],
        outline: [
          "border-border",
          "bg-transparent text-foreground",
        ],
        muted: [
          "bg-muted text-muted-foreground",
        ],
      },
      size: {
        sm: "px-2 py-0 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };