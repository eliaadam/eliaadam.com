import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../design-system/lib/utils";

 

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap",
    "rounded-md",
    "text-sm font-medium",
    "transition-colors duration-200",
    "outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
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

        outline: [
          "border border-border",
          "bg-transparent text-foreground",
          "hover:bg-muted",
        ],

        ghost: ["bg-transparent text-foreground", "hover:bg-muted"],

        destructive: ["bg-error text-error-foreground", "hover:bg-error-600"],

        link: [
          "bg-transparent text-primary",
          "underline-offset-4",
          "hover:underline",
        ],
      },

      size: {
        sm: "h-9 rounded-md px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "size-10",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
