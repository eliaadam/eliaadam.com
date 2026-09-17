import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names and resolves Tailwind CSS conflicts.
 *
 * Examples:
 *
 * cn("px-4", "py-2");
 * cn("bg-primary", condition && "opacity-50");
 * cn("px-4", className);
 *
 * When conflicting Tailwind utilities are provided, the later
 * utility wins:
 *
 * cn("px-4", "px-6") → "px-6"
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}