// src/design-system/components/ui/command.tsx

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "../../design-system/lib/utils";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn(
        [
          "flex h-full w-full flex-col overflow-hidden",
          "rounded-md bg-surface text-foreground",
        ],
        className,
      )}
      {...props}
    />
  );
});

Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => {
  return (
    <div className="flex h-10 items-center border-b border-border px-3">
      <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />

      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          [
            "flex h-full w-full",
            "bg-transparent",
            "py-2",
            "text-sm text-foreground",
            "outline-none",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed",
            "disabled:opacity-50",
          ],
          className,
        )}
        {...props}
      />
    </div>
  );
});

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        "max-h-72 overflow-y-auto overflow-x-hidden p-1",
        className,
      )}
      {...props}
    />
  );
});

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => {
  return (
    <CommandPrimitive.Empty
      ref={ref}
      className="py-6 text-center text-sm text-muted-foreground"
      {...props}
    />
  );
});

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        [
          "overflow-hidden p-1",
          "text-foreground",

          "[&_[cmdk-group-heading]]:px-2",
          "[&_[cmdk-group-heading]]:py-1.5",
          "[&_[cmdk-group-heading]]:text-xs",
          "[&_[cmdk-group-heading]]:font-semibold",
          "[&_[cmdk-group-heading]]:text-muted-foreground",
        ],
        className,
      )}
      {...props}
    />
  );
});

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn("h-px bg-border", className)}
      {...props}
    />
  );
});

CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        [
          "relative flex cursor-default select-none",
          "items-center gap-2",
          "rounded-sm px-2 py-1.5",
          "text-sm text-foreground",
          "outline-none",

          "aria-selected:bg-muted",
          "aria-selected:text-foreground",

          "data-[disabled]:pointer-events-none",
          "data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    />
  );
});

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
};

CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
};
