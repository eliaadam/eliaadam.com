// src/design-system/components/ui/alert.tsx

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../design-system/lib/utils";

const alertVariants = cva(
  [
    "relative w-full rounded-lg border",
    "px-4 py-3",
    "text-sm",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
    "[&>svg~*]:pl-7",
  ],
  {
    variants: {
      variant: {
        default: ["border-border", "bg-surface", "text-foreground"],
        success: ["border-success/30", "bg-success/10", "text-success"],
        warning: ["border-warning/30", "bg-warning/10", "text-warning"],
        error: ["border-error/30", "bg-error/10", "text-error"],
        info: ["border-info/30", "bg-info/10", "text-info"],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      />
    );
  },
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
});

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("text-sm leading-6 opacity-90", className)}
      {...props}
    />
  );
});

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
