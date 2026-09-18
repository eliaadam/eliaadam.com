// src/design-system/components/ui/checkbox.tsx

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "../../design-system/lib/utils";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  invalid?: boolean;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, invalid = false, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        [
          "peer size-4 shrink-0",
          "rounded-sm border border-input",
          "bg-surface",
          "shadow-sm",
          "outline-none",
          "transition-[background-color,border-color,box-shadow] duration-200",

          "focus-visible:border-ring",
          "focus-visible:ring-2",
          "focus-visible:ring-ring/20",

          "data-[state=checked]:border-primary",
          "data-[state=checked]:bg-primary",
          "data-[state=checked]:text-primary-foreground",

          "data-[state=indeterminate]:border-primary",
          "data-[state=indeterminate]:bg-primary",
          "data-[state=indeterminate]:text-primary-foreground",

          "disabled:cursor-not-allowed",
          "disabled:opacity-50",

          "aria-invalid:border-error",
          "aria-invalid:focus-visible:ring-error/20",

          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
