// src/design-system/components/ui/label.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          [
            "text-sm font-medium leading-none",
            "text-foreground",
            "select-none",
            "peer-disabled:cursor-not-allowed",
            "peer-disabled:opacity-50",
          ],
          className,
        )}
        {...props}
      >
        {children}

        {required && (
          <span aria-hidden="true" className="ml-1 text-error">
            *
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";

export { Label };
