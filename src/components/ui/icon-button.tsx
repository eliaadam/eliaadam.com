// src/design-system/components/ui/icon-button.tsx

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../design-system/lib/utils";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "shrink-0",
    "rounded-md",
    "border border-transparent",
    "outline-none",
    "transition-[background-color,border-color,color,box-shadow] duration-200",
    "focus-visible:border-ring",
    "focus-visible:ring-2",
    "focus-visible:ring-ring/20",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "motion-reduce:transition-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground",
          "hover:bg-brand-blue-600",
          "active:bg-brand-blue-700",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-brand-green-600",
          "active:bg-brand-green-700",
        ],
        accent: [
          "bg-accent text-accent-foreground",
          "hover:bg-brand-teal-600",
          "active:bg-brand-teal-700",
        ],
        outline: [
          "border-border",
          "bg-transparent text-foreground",
          "hover:bg-muted",
        ],
        ghost: ["bg-transparent text-foreground", "hover:bg-muted"],
        destructive: [
          "bg-error text-error-foreground",
          "hover:bg-error-600",
          "active:bg-error-700",
        ],
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-11",
        xl: "size-12",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  label: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
