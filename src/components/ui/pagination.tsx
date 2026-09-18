// src/design-system/components/ui/pagination.tsx

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "../../design-system/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
};

Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
});

PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => {
  return <li ref={ref} className={cn(className)} {...props} />;
});

PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
}

const PaginationLink = ({
  className,
  isActive,
  size = "md",
  ...props
}: PaginationLinkProps) => {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        [
          "inline-flex items-center justify-center",
          "rounded-md border",
          "text-sm font-medium",
          "outline-none",
          "transition-colors duration-200",

          "hover:bg-muted",

          "focus-visible:ring-2",
          "focus-visible:ring-ring/20",

          "motion-reduce:transition-none",
        ],
        isActive
          ? "border-primary bg-primary text-primary-foreground hover:bg-brand-blue-600"
          : "border-border bg-surface text-foreground",
        {
          "size-8 text-xs": size === "sm",
          "size-9": size === "md",
          "size-10": size === "lg",
        },
        className,
      )}
      {...props}
    />
  );
};

PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="md"
      className={cn("w-auto gap-1 px-3", className)}
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  );
};

PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="md"
      className={cn("w-auto gap-1 px-3", className)}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="size-4" />
    </PaginationLink>
  );
};

PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4 text-muted-foreground" />
      <span className="sr-only">More pages</span>
    </span>
  );
};

PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
