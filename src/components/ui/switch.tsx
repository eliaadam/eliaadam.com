// src/design-system/components/ui/switch.tsx

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "../../design-system/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        [
          "peer inline-flex h-6 w-11 shrink-0",
          "cursor-pointer items-center",
          "rounded-full border-2 border-transparent",
          "bg-muted",
          "shadow-sm",
          "outline-none",
          "transition-[background-color,box-shadow] duration-200",

          "focus-visible:ring-2",
          "focus-visible:ring-ring/20",

          "data-[state=checked]:bg-primary",

          "disabled:cursor-not-allowed",
          "disabled:opacity-50",

          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn([
          "pointer-events-none block size-5 rounded-full",
          "bg-surface shadow-sm",
          "ring-0",
          "transition-transform duration-200",
          "data-[state=checked]:translate-x-5",
          "data-[state=unchecked]:translate-x-0",
          "motion-reduce:transition-none",
        ])}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
