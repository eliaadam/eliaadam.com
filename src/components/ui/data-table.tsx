// src/design-system/components/ui/data-table.tsx

import * as React from "react";

import { cn } from "../../design-system/lib/utils";

const DataTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-surface",
        className,
      )}
      {...props}
    />
  );
});

DataTable.displayName = "DataTable";

const DataTableScroll = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
};

DataTableScroll.displayName = "DataTableScroll";

const DataTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={cn("border-b border-border bg-muted/50", className)}
      {...props}
    />
  );
});

DataTableHeader.displayName = "DataTableHeader";

const DataTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
});

DataTableBody.displayName = "DataTableBody";

const DataTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={cn(
        [
          "border-b border-border",
          "transition-colors duration-150",
          "hover:bg-muted/50",
          "data-[state=selected]:bg-muted",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
});

DataTableRow.displayName = "DataTableRow";

const DataTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={cn(
        [
          "h-11 px-4",
          "text-left align-middle",
          "text-xs font-semibold uppercase tracking-wide",
          "text-muted-foreground",
          "whitespace-nowrap",
        ],
        className,
      )}
      {...props}
    />
  );
});

DataTableHead.displayName = "DataTableHead";

const DataTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={cn(
        [
          "px-4 py-3",
          "align-middle",
          "text-sm text-foreground",
          "whitespace-nowrap",
        ],
        className,
      )}
      {...props}
    />
  );
});

DataTableCell.displayName = "DataTableCell";

const DataTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <tfoot
      ref={ref}
      className={cn(
        "border-t border-border bg-muted/50 font-medium",
        className,
      )}
      {...props}
    />
  );
});

DataTableFooter.displayName = "DataTableFooter";

const DataTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => {
  return (
    <caption
      ref={ref}
      className={cn("p-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

DataTableCaption.displayName = "DataTableCaption";

export {
  DataTable,
  DataTableScroll,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableFooter,
  DataTableCaption,
};
