import { useCallback, useEffect, useRef } from "react";

type Axis = "horizontal" | "vertical";

interface UseAutoCenterScrollOptions {
    /** Scroll axis. Defaults to "horizontal". */
    axis?: Axis;
    /** "center" aligns the active item to the middle; "edge" only scrolls the minimum amount to bring it fully into view. Defaults to "center". */
    align?: "center" | "edge";
    /** Smooth vs instant scroll. Defaults to "smooth". */
    behavior?: ScrollBehavior;
}

/**
 * Keeps a scrollable container automatically scrolled so the "active" item
 * stays visible — centered or edge-aligned, horizontal or vertical.
 *
 * Usage:
 *   const { containerRef, registerItem } = useAutoCenterScroll(activeKey, { axis: "horizontal" });
 *   <div ref={containerRef}>
 *     <button ref={registerItem("tab-1")}>...</button>
 *   </div>
 *
 * const { containerRef, registerItem } = useAutoCenterScroll<HTMLButtonElement>(activeId, {
 *  axis: "vertical",
 *  align: "edge", // just keep it visible, don't force-center every scroll
 * });
 *
 * <div ref={containerRef} className="scroll-thin overflow-y-auto max-h-96">
 *  {items.map((item) => (
 *    <button key={item.id} ref={registerItem(item.id)} onClick={() => setActiveId(item.id)}>
 *      {item.label}
 *    </button>
 *  ))}
 * </div>
*/
export function useAutoCenterScroll<T extends HTMLElement = HTMLElement>(
    activeKey: string | null | undefined,
    options: UseAutoCenterScrollOptions = {},
) {
    const { axis = "horizontal", align = "center", behavior = "smooth" } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, T>>(new Map());

    const registerItem = useCallback(
        (key: string) => (el: T | null) => {
            if (el) itemRefs.current.set(key, el);
            else itemRefs.current.delete(key);
        },
        [],
    );

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const container = containerRef.current;
            const item = activeKey ? itemRefs.current.get(activeKey) : null;
            if (!container || !item) return;

            const containerRect = container.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();

            if (axis === "horizontal") {
                const delta =
                    align === "center"
                        ? itemRect.left -
                        containerRect.left -
                        (containerRect.width - itemRect.width) / 2
                        : itemRect.left < containerRect.left
                            ? itemRect.left - containerRect.left
                            : itemRect.right > containerRect.right
                                ? itemRect.right - containerRect.right
                                : 0;

                if (delta !== 0) container.scrollBy({ left: delta, behavior });
            } else {
                const delta =
                    align === "center"
                        ? itemRect.top -
                        containerRect.top -
                        (containerRect.height - itemRect.height) / 2
                        : itemRect.top < containerRect.top
                            ? itemRect.top - containerRect.top
                            : itemRect.bottom > containerRect.bottom
                                ? itemRect.bottom - containerRect.bottom
                                : 0;

                if (delta !== 0) container.scrollBy({ top: delta, behavior });
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [activeKey, axis, align, behavior]);

    return { containerRef, registerItem };
}