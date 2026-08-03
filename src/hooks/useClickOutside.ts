import { useEffect, type RefObject } from "react";

/**
 * Closes a popover when the user clicks/taps outside all given refs,
 * or presses Escape. Pass `active: false` to skip attaching listeners
 * when the popover is already closed.
 */
export function useClickOutside(
    refs: RefObject<HTMLElement | null>[],
    onDismiss: () => void,
    active: boolean = true,
) {
    useEffect(() => {
        if (!active) return;

        function handlePointer(event: MouseEvent | TouchEvent) {
            const target = event.target as Node;
            const inside = refs.some((ref) => ref.current?.contains(target));
            if (!inside) onDismiss();
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") onDismiss();
        }

        document.addEventListener("mousedown", handlePointer);
        document.addEventListener("touchstart", handlePointer);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handlePointer);
            document.removeEventListener("touchstart", handlePointer);
            document.removeEventListener("keydown", handleKey);
        };
    }, [refs, onDismiss, active]);
}