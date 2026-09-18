// src/design-system/components/ui/alert-dialog.tsx

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../design-system/lib/utils";

 
const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn(
        [
          "fixed inset-0 z-50",
          "bg-black/50 backdrop-blur-[2px]",

          "data-[state=open]:animate-in",
          "data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0",
          "data-[state=open]:fade-in-0",

          "motion-reduce:animate-none",
        ],
        className,
      )}
      {...props}
    />
  );
});

AlertDialogOverlay.displayName =
  AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Content
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />

      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          [
            "fixed left-1/2 top-1/2 z-50",
            "grid w-[calc(100%-2rem)] max-w-lg",
            "-translate-x-1/2 -translate-y-1/2",
            "gap-4",
            "rounded-xl border border-border",
            "bg-surface p-6 text-surface-foreground",
            "shadow-xl",

            "data-[state=open]:animate-in",
            "data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0",
            "data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95",
            "data-[state=open]:zoom-in-95",

            "motion-reduce:animate-none",
          ],
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});

AlertDialogContent.displayName =
  AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-left",
      className,
    )}
    {...props}
  />
);

AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);

AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Title
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
});

AlertDialogTitle.displayName =
  AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Description
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn(
        "text-sm leading-6 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});

AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Action
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        [
          "inline-flex h-10 items-center justify-center",
          "rounded-md px-4 py-2",
          "bg-primary text-sm font-medium",
          "text-primary-foreground",
          "outline-none",
          "transition-colors duration-200",

          "hover:bg-brand-blue-600",
          "active:bg-brand-blue-700",

          "focus-visible:ring-2 focus-visible:ring-ring/20",

          "disabled:pointer-events-none",
          "disabled:opacity-50",

          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
});

AlertDialogAction.displayName =
  AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Cancel
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        [
          "inline-flex h-10 items-center justify-center",
          "rounded-md border border-border",
          "bg-transparent px-4 py-2",
          "text-sm font-medium text-foreground",
          "outline-none",
          "transition-colors duration-200",

          "hover:bg-muted",

          "focus-visible:ring-2 focus-visible:ring-ring/20",

          "disabled:pointer-events-none",
          "disabled:opacity-50",

          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
});

AlertDialogCancel.displayName =
  AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};