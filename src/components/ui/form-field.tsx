// src/design-system/components/ui/form-field.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string;
  hint?: string;
  required?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, children, error, hint, required = false, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("grid gap-2", className)} {...props}>
        {children}

        {hint && !error && (
          <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
        )}

        {error && (
          <p role="alert" className="text-xs leading-5 text-error">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export { FormField };
