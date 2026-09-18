// src/design-system/components/ui/tabs.tsx

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../design-system/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        [
          "inline-flex h-10 items-center justify-center",
          "rounded-md bg-muted p-1",
          "text-muted-foreground",
        ],
        className,
      )}
      {...props}
    />
  );
});

TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        [
          "inline-flex h-8 items-center justify-center",
          "whitespace-nowrap rounded-sm px-3",
          "text-sm font-medium",
          "outline-none",
          "transition-[background-color,color,box-shadow] duration-200",

          "hover:text-foreground",

          "data-[state=active]:bg-surface",
          "data-[state=active]:text-foreground",
          "data-[state=active]:shadow-sm",

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

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        [
          "mt-4 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/20",
          "focus-visible:ring-offset-2",
        ],
        className,
      )}
      {...props}
    />
  );
});

TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
