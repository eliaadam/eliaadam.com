// src/design-system/components/ui/typography.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as: Component = "p", className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("text-base leading-7 text-foreground", className)}
        {...props}
      />
    );
  },
);

Typography.displayName = "Typography";

const H1 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h1
      ref={ref}
      className={cn(
        [
          "text-3xl font-bold tracking-tight",
          "text-foreground",
          "sm:text-4xl",
          "lg:text-5xl",
        ],
        className,
      )}
      {...props}
    />
  );
});

H1.displayName = "H1";

const H2 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn(
        [
          "text-2xl font-semibold tracking-tight",
          "text-foreground",
          "sm:text-3xl",
          "lg:text-4xl",
        ],
        className,
      )}
      {...props}
    />
  );
});

H2.displayName = "H2";

const H3 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        [
          "text-xl font-semibold tracking-tight",
          "text-foreground",
          "sm:text-2xl",
        ],
        className,
      )}
      {...props}
    />
  );
});

H3.displayName = "H3";

const H4 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      className={cn(
        ["text-lg font-semibold", "text-foreground", "sm:text-xl"],
        className,
      )}
      {...props}
    />
  );
});

H4.displayName = "H4";

const Lead = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(["text-lg leading-8", "text-muted-foreground"], className)}
      {...props}
    />
  );
});

Lead.displayName = "Lead";

const Muted = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(["text-sm leading-6", "text-muted-foreground"], className)}
      {...props}
    />
  );
});

Muted.displayName = "Muted";

const Small = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <small
        ref={ref}
        className={cn(
          ["text-xs font-medium leading-5", "text-foreground"],
          className,
        )}
        {...props}
      />
    );
  },
);

Small.displayName = "Small";

const Caption = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(["text-xs leading-5", "text-muted-foreground"], className)}
      {...props}
    />
  );
});

Caption.displayName = "Caption";

const Code = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={cn(
          [
            "rounded-md bg-muted",
            "px-1.5 py-0.5",
            "font-mono text-xs",
            "text-foreground",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

Code.displayName = "Code";

export { Typography, H1, H2, H3, H4, Lead, Muted, Small, Caption, Code };
