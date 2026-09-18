// src/design-system/components/ui/card.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        [
          "rounded-xl border border-border",
          "bg-surface text-surface-foreground",
          "shadow-sm",
        ],
        className,
      )}
      {...props}
    />
  );
});

Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(["flex flex-col space-y-1.5", "p-4 sm:p-6"], className)}
      {...props}
    />
  );
});

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        [
          "text-lg font-semibold leading-none",
          "tracking-tight text-foreground",
        ],
        className,
      )}
      {...props}
    />
  );
});

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        ["text-sm text-muted-foreground", "leading-relaxed"],
        className,
      )}
      {...props}
    />
  );
});

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(["px-4 pb-4 sm:px-6 sm:pb-6"], className)}
      {...props}
    />
  );
});

CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        [
          "flex flex-col gap-2",
          "border-t border-border",
          "px-4 py-4 sm:flex-row sm:items-center sm:px-6",
        ],
        className,
      )}
      {...props}
    />
  );
});

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
