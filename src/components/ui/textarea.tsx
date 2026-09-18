// src/design-system/components/ui/textarea.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          [
            "flex min-h-24 w-full min-w-0 resize-y",
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

Textarea.displayName = "Textarea";

export { Textarea };
