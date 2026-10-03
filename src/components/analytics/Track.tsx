import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { trackFormSubmit, trackInteraction } from "../../lib/analytics";

/**
 * Naming things so analytics can tell them apart.
 *
 * Every click on a button or link is already counted — but WITHOUT identity, because what a button says is often a
 * person's name. To know WHICH control was clicked or WHICH panel was seen, name it with a developer-chosen id of the
 * form  area.thing[.part]  (lowercase, dotted):
 *
 *   <button {...trackProps("faith.people.new-person")}>＋ New person</button>   // clicks on it are attributed
 *   <Track component="faith.people.list">…</Track>                              // counted as seen once half-visible for 1s
 *   <form {...trackProps("faith.people.create-form", { form: true })}>           // start / submit / abandon
 *
 * An id that doesn't match the pattern is ignored (the click still counts, unnamed) — it can never become free text.
 */
export function trackProps(
  component: string,
  options: { view?: boolean; form?: boolean; ignoreDead?: boolean } = {},
): Record<string, string | true> {
  const attrs: Record<string, string | true> = { "data-track": component };
  if (options.view) attrs["data-track-view"] = component;
  if (options.form) attrs["data-track-form"] = component;
  if (options.ignoreDead) attrs["data-track-ignore-dead"] = true;
  return attrs;
}

interface TrackProps extends HTMLAttributes<HTMLElement> {
  /** The component's analytics id, e.g. "faith.people.list". */
  component: string;
  /** Count an impression when it's been at least half on screen for a second (default true). */
  view?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

/** A wrapper element that names a region of the page for analytics. Renders a `div` unless you pass `as`. */
export function Track({ component, view = true, as = "div", children, ...rest }: TrackProps) {
  return createElement(as, { ...rest, ...trackProps(component, { view }) }, children);
}

/** For events a click can't describe: a deliberate, named interaction, or a form that completes through a button handler. */
export function useTrack() {
  return {
    interaction: (component: string, action: string) => trackInteraction(component, action),
    formSubmit: (component: string, outcome: "ok" | "error") => trackFormSubmit(component, outcome),
  };
}
