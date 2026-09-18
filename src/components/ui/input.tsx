import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          [
            "flex h-10 w-full min-w-0",
            "rounded-md border border-input",
            "bg-surface text-sm text-foreground",
            "px-3 py-2",
            "shadow-sm",
            "outline-none",
            "transition-[border-color,box-shadow,background-color] duration-200",

            "placeholder:text-muted-foreground",

            "focus-visible:border-ring",
            "focus-visible:ring-2",
            "focus-visible:ring-ring/20",

            "disabled:cursor-not-allowed",
            "disabled:opacity-50",

            "file:mr-3",
            "file:border-0",
            "file:bg-transparent",
            "file:text-sm",
            "file:font-medium",
            "file:text-foreground",

            "aria-invalid:border-error",
            "aria-invalid:focus-visible:border-error",
            "aria-invalid:focus-visible:ring-error/20",

            "motion-reduce:transition-none",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
