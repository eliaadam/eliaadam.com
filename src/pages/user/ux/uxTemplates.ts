/*
 * UX template tokens — the ENTIRE meaning of a template at Level 1, as data.
 *
 * A template is not code scattered through panels; it is a set of CSS custom
 * properties. Panels and shells read the variables, never the template name.
 * Adding a template = adding a row here. That's the whole point: presentation
 * is data, so it can't drift into conditionals nobody can find later.
 *
 * INVARIANT: these control appearance only. Nothing here gates access, hides an
 * API, or changes what a permission means. A template can make a control big or
 * small; it cannot make an unauthorized action authorized, or a forbidden one
 * safe by hiding it.
 */

export type UxTemplateCode = "standard" | "compact" | "kiosk" | "executive";

export type UxTokens = {
  /* type scale */
  "--ux-font-base": string;
  "--ux-font-sm": string;
  "--ux-font-lg": string;
  "--ux-font-heading": string;
  /* spacing */
  "--ux-space-unit": string;
  "--ux-panel-pad": string;
  "--ux-gap": string;
  /* controls */
  "--ux-control-height": string;
  "--ux-control-pad-x": string;
  "--ux-radius": string;
  /* tap target minimum — kiosk needs fat targets */
  "--ux-tap-min": string;
  /* layout hint the workspace shell reads (see workspaceLayout) */
  "--ux-density": string;
};

export const UX_TOKENS: Record<UxTemplateCode, UxTokens> = {
  // The baseline. Everything else is a deviation from this.
  standard: {
    "--ux-font-base": "0.875rem",
    "--ux-font-sm": "0.75rem",
    "--ux-font-lg": "1rem",
    "--ux-font-heading": "1.125rem",
    "--ux-space-unit": "0.25rem",
    "--ux-panel-pad": "1.5rem",
    "--ux-gap": "1rem",
    "--ux-control-height": "2.25rem",
    "--ux-control-pad-x": "0.75rem",
    "--ux-radius": "0.5rem",
    "--ux-tap-min": "2.25rem",
    "--ux-density": "comfortable",
  },

  // Denser: power users, small screens, lots on one page.
  compact: {
    "--ux-font-base": "0.8125rem",
    "--ux-font-sm": "0.6875rem",
    "--ux-font-lg": "0.9375rem",
    "--ux-font-heading": "1rem",
    "--ux-space-unit": "0.1875rem",
    "--ux-panel-pad": "1rem",
    "--ux-gap": "0.625rem",
    "--ux-control-height": "2rem",
    "--ux-control-pad-x": "0.625rem",
    "--ux-radius": "0.375rem",
    "--ux-tap-min": "2rem",
    "--ux-density": "compact",
  },

  // Counter / shared device: big text, big targets, few things on screen.
  kiosk: {
    "--ux-font-base": "1.0625rem",
    "--ux-font-sm": "0.9375rem",
    "--ux-font-lg": "1.375rem",
    "--ux-font-heading": "1.75rem",
    "--ux-space-unit": "0.375rem",
    "--ux-panel-pad": "2rem",
    "--ux-gap": "1.5rem",
    "--ux-control-height": "3.25rem",
    "--ux-control-pad-x": "1.25rem",
    "--ux-radius": "0.75rem",
    "--ux-tap-min": "3.25rem",
    "--ux-density": "spacious",
  },

  // Summary-first: calm, spacious, figures over data entry.
  executive: {
    "--ux-font-base": "0.9375rem",
    "--ux-font-sm": "0.8125rem",
    "--ux-font-lg": "1.125rem",
    "--ux-font-heading": "1.5rem",
    "--ux-space-unit": "0.3125rem",
    "--ux-panel-pad": "2rem",
    "--ux-gap": "1.25rem",
    "--ux-control-height": "2.5rem",
    "--ux-control-pad-x": "1rem",
    "--ux-radius": "0.625rem",
    "--ux-tap-min": "2.5rem",
    "--ux-density": "spacious",
  },
};

/* Level 2 — the workspace SHELL each template uses to arrange capabilities.
 * This is layout shape, chosen once by the workspace page, not by panels. */
export type WorkspaceLayout = "tabs" | "grid" | "dashboard";

export const WORKSPACE_LAYOUT: Record<UxTemplateCode, WorkspaceLayout> = {
  standard: "tabs",       // horizontal tabs (today's behaviour)
  compact: "tabs",        // same shape, denser tokens
  kiosk: "grid",          // big vertical button grid, one panel at a time
  executive: "dashboard", // summary cards; panel opens on demand
};

/** Safe lookup — an unknown template falls back to standard, never breaks. */
export function tokensFor(code: string | null | undefined): UxTokens {
  return UX_TOKENS[(code ?? "standard") as UxTemplateCode] ?? UX_TOKENS.standard;
}

export function layoutFor(code: string | null | undefined): WorkspaceLayout {
  return WORKSPACE_LAYOUT[(code ?? "standard") as UxTemplateCode] ?? "tabs";
}
