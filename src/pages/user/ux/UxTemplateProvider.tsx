import { createContext, useContext, useMemo } from "react";
import {
  tokensFor,
  layoutFor,
  type UxTemplateCode,
  type WorkspaceLayout,
} from "./uxTemplates";

/*
 * Resolves the UX template ONCE at the workspace boundary and exposes it to
 * everything below — as CSS variables on a wrapper (Level 1) and as a hook
 * (so a panel can opt into Level 3 later, but never has to).
 *
 * The context is a PRESENTATION context. A panel that never calls the hook
 * still gets the token styling for free through the wrapper. This is the
 * "adopt at your own pace" property: template-awareness is additive, never
 * required, and a panel that ignores it renders in the resolved density
 * without any code of its own.
 */

type UxContextValue = {
  template: UxTemplateCode | string;
  layout: WorkspaceLayout;
  /** Convenience for panels branching on density without importing the map. */
  isSpacious: boolean;
  isCompact: boolean;
};

const UxContext = createContext<UxContextValue>({
  template: "standard",
  layout: "tabs",
  isSpacious: false,
  isCompact: false,
});

export function useUxTemplate(): UxContextValue {
  return useContext(UxContext);
}

export function UxTemplateProvider({
  template,
  children,
}: {
  template: string | null | undefined;
  children: React.ReactNode;
}) {
  const value = useMemo<UxContextValue>(() => {
    const layout = layoutFor(template);
    return {
      template: template ?? "standard",
      layout,
      isSpacious: layout === "grid" || layout === "dashboard",
      isCompact: (template ?? "") === "compact",
    };
  }, [template]);

  // Tokens become inline CSS variables on the wrapper. Anything inside can read
  // var(--ux-*) in className or style. Scoped to this subtree — two workspaces
  // in different templates on one screen wouldn't collide (they won't, but the
  // scoping is honest).
  const style = tokensFor(template) as React.CSSProperties;

  return (
    <UxContext.Provider value={value}>
      <div
        style={style}
        data-ux-template={value.template}
        data-ux-layout={value.layout}
      >
        {children}
      </div>
    </UxContext.Provider>
  );
}
