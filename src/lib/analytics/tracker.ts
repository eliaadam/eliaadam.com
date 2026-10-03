import { fingerprint, normalizeRoute, sanitizeMessage, validComponent } from "./normalize";

/**
 * The browser-side tracker: framework-free, so it can be tested without React and mounted from anywhere.
 *
 * Hard rules it keeps:
 *   - It NEVER throws into the host app. Every listener and every public method is wrapped.
 *   - It NEVER records what people type or what an element says. Components are identified by a developer-chosen id
 *     (data-track="faith.people.new-person"); unannotated clicks are counted with no identity at all.
 *   - It respects Do-Not-Track, Global Privacy Control, a per-browser opt-out, the operator's kill switch and sampling.
 *   - It never slows the app down: events are queued, batched, and sent fire-and-forget.
 *
 * What it records (see the server's domain/events.py for the matching allow-list):
 *   page_view / page_leave / heartbeat   — visits, and ACTIVE time on a page (tab visible AND recent input)
 *   impression                           — a [data-track-view] element at least half visible for a full second, once per page view
 *   click / rage_click / dead_click      — clicks, bursts of frustrated clicks, and clicks on controls that did nothing
 *   form_start / form_submit / form_abandon, interaction, error, api_call
 */

export const TRACKER_VERSION = "1.0.0";

const VISITOR_KEY = "maicore.analytics.visitor";
const SESSION_KEY = "maicore.analytics.session";
const OPTOUT_KEY = "maicore.analytics.optout";

const SESSION_IDLE_MS = 30 * 60 * 1000; // a session ends after 30 minutes without activity — also the server's definition
const ACTIVE_IDLE_MS = 30 * 1000; // "active" means input within the last 30 seconds
const MAX_TICK_MS = 5000; // a longer gap than this means the device slept; don't count it as time on page
const MAX_QUEUE = 500;
const MAX_ATTEMPTS = 5;
const MAX_API_CALLS_PER_PAGE = 100;
const MAX_ERRORS_PER_PAGE = 10;
const CONFIG_REFRESH_MS = 120_000;
const IMPRESSION_VISIBLE_MS = 1000;
const IMPRESSION_RATIO = 0.5;
const DEAD_CLICK_WAIT_MS = 700;
const RAGE_WINDOW_MS = 1000;
const RAGE_RADIUS_PX = 40;
const RAGE_COOLDOWN_MS = 1500;

export type TrackerStatus = "not_started" | "active" | "opted_out" | "do_not_track" | "disabled" | "sampled_out";

export interface TrackerOptions {
  /** e.g. `${API_BASE_URL}/api/analytics` */
  endpoint: string;
  getAuthToken: () => string | null | undefined;
  getContainerId?: () => string | null | undefined;
  /** Injectable clock, for tests. */
  now?: () => number;
  debug?: boolean;
}

interface Config { enabled: boolean; sample_rate: number; heartbeat_seconds: number; flush_seconds: number; max_batch: number }
const DEFAULT_CONFIG: Config = { enabled: true, sample_rate: 1, heartbeat_seconds: 30, flush_seconds: 10, max_batch: 50 };

interface QueuedEvent {
  id: string; type: string; ts: number; session_id: string; route: string;
  page_view_id?: string; component?: string; container_id?: string; props?: Record<string, unknown>; attempts: number;
}

interface PageState {
  id: string; route: string; startedAt: number; activeMs: number; visibleMs: number; lastTick: number; maxScroll: number;
  heartbeatsSent: number; impressions: Set<string>; forms: Map<string, FormState>; errorFingerprints: Set<string>; apiCalls: number;
}
interface FormState { startedAt: number; touched: Set<string>; submitted: boolean }

type PropBag = Record<string, unknown>;

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input, select, textarea, summary, label';
const DEADABLE = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], summary, input[type="submit"], input[type="button"]';

function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const r = (n: number) => Math.floor(Math.random() * n);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => (ch === "x" ? r(16) : 8 + r(4)).toString(16));
}

export class Tracker {
  private opts: TrackerOptions | null = null;
  private config: Config = DEFAULT_CONFIG;
  private state: TrackerStatus = "not_started";
  private listeners = new Set<() => void>();
  private queue: QueuedEvent[] = [];
  private page: PageState | null = null;
  private currentRoute = "/";
  private firstPage = true;
  private sending = false;
  private backoffUntil = 0;
  private visitorMem: string | null = null;
  private sessionMem: { id: string; last: number; sampled: boolean } | null = null;
  private lastSessionWrite = 0;
  private lastInput = 0;
  private timers: { flush?: ReturnType<typeof setInterval>; tick?: ReturnType<typeof setInterval>; config?: ReturnType<typeof setInterval> } = {};
  private teardown: Array<() => void> = [];
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private viewTimers = new Map<Element, ReturnType<typeof setTimeout>>();
  private clicks: Array<{ t: number; x: number; y: number }> = [];
  private lastRageAt = 0;
  private mutations = 0;
  private pageSeq = 0;
  private apiCallSeq = 0;

  // -- status, for the UI -------------------------------------------------------------------------------------------------

  getStatus(): TrackerStatus { return this.state; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private setState(next: TrackerStatus): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((l) => { try { l(); } catch { /* a UI listener's problem is not ours */ } });
  }
  private now(): number { return this.opts?.now ? this.opts.now() : Date.now(); }
  private log(...args: unknown[]): void { if (this.opts?.debug) console.debug("[analytics]", ...args); }
  private safe<T extends unknown[]>(fn: (...a: T) => void): (...a: T) => void {
    return (...a: T) => { try { fn(...a); } catch (err) { this.log("swallowed", err); } };
  }

  // -- lifecycle ---------------------------------------------------------------------------------------------------------------

  init(options: TrackerOptions): void {
    try {
      if (typeof window === "undefined" || typeof document === "undefined" || this.opts) return;
      this.opts = options;
      if (this.optedOut()) { this.setState("opted_out"); return; }
      if (this.doNotTrack()) { this.setState("do_not_track"); return; }
      this.setState("active");
      this.listen();
      this.timers.flush = setInterval(this.safe(() => { void this.flush(); }), this.config.flush_seconds * 1000);
      this.timers.tick = setInterval(this.safe(() => this.tick()), 1000);
      this.timers.config = setInterval(this.safe(() => { void this.fetchConfig(); }), CONFIG_REFRESH_MS);
      void this.fetchConfig();
    } catch (err) { this.log("init failed", err); }
  }

  /** Stop everything and remove every listener (tests, hot reload). */
  shutdown(): void {
    try {
      Object.values(this.timers).forEach((t) => t && clearInterval(t));
      this.timers = {};
      this.teardown.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      this.teardown = [];
      this.viewTimers.forEach((t) => clearTimeout(t));
      this.viewTimers.clear();
      this.mutationObserver?.disconnect(); this.intersectionObserver?.disconnect();
      this.mutationObserver = null; this.intersectionObserver = null;
      this.queue = []; this.page = null; this.opts = null; this.firstPage = true;
      this.setState("not_started");
    } catch { /* ignore */ }
  }

  private optedOut(): boolean {
    try { return window.localStorage.getItem(OPTOUT_KEY) === "1"; } catch { return false; }
  }
  private doNotTrack(): boolean {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    const w = window as Window & { doNotTrack?: string };
    return nav.doNotTrack === "1" || w.doNotTrack === "1" || nav.globalPrivacyControl === true;
  }

  /** The browser-level opt-out. Opting out also forgets this browser's anonymous id and any unsent events. */
  setOptOut(optOut: boolean): void {
    try {
      if (optOut) {
        window.localStorage.setItem(OPTOUT_KEY, "1");
        window.localStorage.removeItem(VISITOR_KEY); window.localStorage.removeItem(SESSION_KEY);
        this.visitorMem = null; this.sessionMem = null; this.queue = [];
        this.setState("opted_out");
      } else {
        window.localStorage.removeItem(OPTOUT_KEY);
        if (this.opts && this.state === "opted_out") { const o = this.opts; this.opts = null; this.init(o); }
      }
    } catch { /* storage blocked: nothing to remember, nothing to do */ }
  }

  private async fetchConfig(): Promise<void> {
    if (!this.opts) return;
    try {
      const response = await fetch(`${this.opts.endpoint}/config/`, { credentials: "omit" });
      if (!response.ok) return;
      const c = (await response.json()) as Partial<Config>;
      this.config = {
        enabled: c.enabled !== false, sample_rate: typeof c.sample_rate === "number" ? Math.min(Math.max(c.sample_rate, 0), 1) : 1,
        heartbeat_seconds: c.heartbeat_seconds ?? 30, flush_seconds: c.flush_seconds ?? 10, max_batch: Math.min(c.max_batch ?? 50, 50),
      };
      if (!this.config.enabled) { this.queue = []; this.setState("disabled"); }
      else if (this.state === "disabled") this.setState("active");
    } catch { /* offline, or the endpoint is down: keep the defaults, try again later */ }
  }

  // -- identity ---------------------------------------------------------------------------------------------------------------------

  private visitorId(): string {
    try {
      let v = window.localStorage.getItem(VISITOR_KEY);
      if (!v) { v = uuid(); window.localStorage.setItem(VISITOR_KEY, v); }
      return v;
    } catch { return (this.visitorMem ??= uuid()); }
  }

  /** The current session, rotating after 30 idle minutes. Whether this session is sampled in is decided once, here. */
  private session(): { id: string; sampled: boolean } {
    const t = this.now();
    let s: { id: string; last: number; sampled: boolean } | null = this.sessionMem;
    try { const raw = window.localStorage.getItem(SESSION_KEY); if (raw) s = JSON.parse(raw); } catch { /* use memory */ }
    if (!s || t - s.last > SESSION_IDLE_MS) s = { id: uuid(), last: t, sampled: Math.random() < this.config.sample_rate };
    s.last = t;
    this.sessionMem = s;
    if (t - this.lastSessionWrite > 5000 || !this.lastSessionWrite) {
      this.lastSessionWrite = t;
      try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* memory only */ }
    }
    return s;
  }

  // -- emitting ----------------------------------------------------------------------------------------------------------------------------

  private live(): boolean { return this.state === "active" && this.opts !== null; }

  /** Queue one event. `fields.component` must be a valid component id; anything else is dropped (the event is kept, unnamed). */
  track(type: string, fields: { component?: string; props?: PropBag; route?: string } = {}): void {
    try {
      if (!this.live()) return;
      const s = this.session();
      if (!s.sampled) { this.setState("sampled_out"); return; }
      const container = this.opts?.getContainerId?.() ?? undefined;
      const e: QueuedEvent = {
        id: uuid(), type, ts: this.now(), session_id: s.id, route: fields.route ?? this.page?.route ?? this.currentRoute, attempts: 0,
        ...(this.page ? { page_view_id: this.page.id } : {}), ...(validComponent(fields.component) ? { component: validComponent(fields.component)! } : {}),
        ...(container ? { container_id: container } : {}), ...(fields.props ? { props: fields.props } : {}),
      };
      this.queue.push(e);
      if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE); // oldest first: bounded memory
      if (this.queue.length >= 20) void this.flush();
    } catch (err) { this.log("track failed", err); }
  }

  // -- pages ----------------------------------------------------------------------------------------------------------------------------------

  /** Call on every route change. Closes the previous page (with its time on page) and opens the new one. */
  pageView(path: string): void {
    try {
      if (!this.live()) return;
      this.leavePage();
      this.pageSeq++;
      const route = normalizeRoute(path);
      const prev = this.currentRoute;
      this.currentRoute = route;
      const t = this.now();
      this.page = {
        id: uuid(), route, startedAt: t, activeMs: 0, visibleMs: 0, lastTick: t, maxScroll: 0, heartbeatsSent: 0,
        impressions: new Set(), forms: new Map(), errorFingerprints: new Set(), apiCalls: 0,
      };
      this.lastInput = t;
      const props: PropBag = { referrer: this.firstPage ? this.externalReferrer() : prev };
      if (this.firstPage) { const load = this.loadMs(); if (load !== undefined) props.load_ms = load; }
      this.firstPage = false;
      this.track("page_view", { props });
      setTimeout(this.safe(() => this.scanForViews(document)), 50); // let the new page render, then look for [data-track-view]
    } catch (err) { this.log("pageView failed", err); }
  }

  private externalReferrer(): string {
    const ref = document.referrer;
    if (!ref) return "direct";
    try { return new URL(ref).origin === window.location.origin ? normalizeRoute(new URL(ref).pathname) : "external"; } catch { return "external"; }
  }
  private loadMs(): number | undefined {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd - nav.startTime) : undefined;
    } catch { return undefined; }
  }

  private leavePage(): void {
    const p = this.page;
    if (!p) return;
    this.tick();
    this.track("page_leave", { props: { active_ms: Math.round(p.activeMs), visible_ms: Math.round(p.visibleMs), max_scroll_pct: Math.min(100, Math.round(p.maxScroll)) } });
    p.forms.forEach((f, component) => {
      if (!f.submitted) this.track("form_abandon", { component, props: { duration_ms: Math.max(0, this.now() - f.startedAt), fields_touched: f.touched.size } });
    });
    this.page = null;
  }

  /** Counts ACTIVE time only: the tab must be visible AND the person must have done something in the last 30 seconds. */
  private tick(): void {
    const p = this.page;
    if (!p) return;
    const t = this.now();
    const delta = t - p.lastTick;
    p.lastTick = t;
    if (delta <= 0 || delta > MAX_TICK_MS) return;
    if (document.visibilityState === "visible") {
      p.visibleMs += delta;
      if (t - this.lastInput <= ACTIVE_IDLE_MS) p.activeMs += delta;
    }
    const interval = this.config.heartbeat_seconds * 1000;
    if (p.activeMs >= (p.heartbeatsSent + 1) * interval) {
      p.heartbeatsSent++;
      this.track("heartbeat", { props: { active_ms: Math.round(p.activeMs) } });
    }
  }

  // -- DOM listeners ----------------------------------------------------------------------------------------------------------------------------

  private listen(): void {
    const on = (target: Document | Window, type: string, handler: (e: Event) => void, capture = true) => {
      const wrapped = this.safe(handler);
      target.addEventListener(type, wrapped, { capture, passive: true });
      this.teardown.push(() => target.removeEventListener(type, wrapped, { capture }));
    };
    for (const type of ["mousemove", "keydown", "touchstart", "wheel", "click"]) on(document, type, () => { this.lastInput = this.now(); });
    on(window, "scroll", () => {
      this.lastInput = this.now();
      const p = this.page; if (!p) return;
      const doc = document.documentElement;
      const total = Math.max(doc.scrollHeight, window.innerHeight, 1);
      p.maxScroll = Math.max(p.maxScroll, ((window.scrollY + window.innerHeight) / total) * 100);
    });
    on(document, "click", (e) => this.onClick(e as MouseEvent));
    on(document, "focusin", (e) => this.onFormEvent(e, "start"));
    on(document, "input", (e) => this.onFormEvent(e, "touch"));
    on(document, "change", (e) => this.onFormEvent(e, "touch"));
    on(document, "submit", (e) => this.onFormEvent(e, "submit"));
    on(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") { this.tick(); this.heartbeatNow(); void this.flush(true); }
      else if (this.page) this.page.lastTick = this.now();
    });
    on(window, "pagehide", () => { this.leavePage(); void this.flush(true); }, false);
    on(window, "error", (e) => this.onError(e as ErrorEvent, "js"), false);
    on(window, "unhandledrejection", (e) => this.onError(e as PromiseRejectionEvent, "unhandled_rejection"), false);

    if (typeof MutationObserver !== "undefined") {
      this.mutationObserver = new MutationObserver(this.safe((records) => {
        this.mutations += records.length;
        for (const r of records) r.addedNodes.forEach((n) => { if (n.nodeType === 1) this.scanForViews(n as Element); });
      }));
      this.mutationObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    }
  }

  private heartbeatNow(): void {
    const p = this.page;
    if (p && p.activeMs > 0) this.track("heartbeat", { props: { active_ms: Math.round(p.activeMs) } });
  }

  private onClick(e: MouseEvent): void {
    if (!this.live()) return;
    const target = e.target as Element | null;
    if (!target || typeof target.closest !== "function") return;
    const tracked = target.closest("[data-track]") as HTMLElement | null;
    const interactive = target.closest(INTERACTIVE) as HTMLElement | null;
    if (!tracked && !interactive) return;
    const component = tracked?.getAttribute("data-track") ?? undefined;
    const kind = this.kindOf(interactive ?? tracked!);
    this.track("click", { component, props: { kind } });
    this.detectRage(e, component);
    const deadable = target.closest(DEADABLE) as HTMLElement | null;
    if (deadable && !this.skipsDeadClick(deadable)) this.watchForDeadClick(deadable, component, kind);
  }

  private kindOf(el: Element): "button" | "link" | "input" | "select" | "other" {
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button" || el.getAttribute("role") === "button" || el.getAttribute("role") === "tab") return "button";
    if (tag === "select") return "select";
    if (tag === "input" || tag === "textarea") return "input";
    return "other";
  }

  private detectRage(e: MouseEvent, component: string | undefined): void {
    const t = this.now();
    this.clicks = this.clicks.filter((c) => t - c.t <= RAGE_WINDOW_MS);
    this.clicks.push({ t, x: e.clientX, y: e.clientY });
    const first = this.clicks[0]!;
    const close = this.clicks.filter((c) => Math.hypot(c.x - first.x, c.y - first.y) <= RAGE_RADIUS_PX);
    if (close.length >= 3 && t - this.lastRageAt > RAGE_COOLDOWN_MS) {
      this.lastRageAt = t;
      this.track("rage_click", { component, props: { clicks: close.length } });
    }
  }

  private skipsDeadClick(el: HTMLElement): boolean {
    if (el.closest("[data-track-ignore-dead]")) return true;
    if (el.getAttribute("aria-disabled") === "true" || (el as HTMLButtonElement).disabled) return true;
    if (el.tagName === "A") {
      const a = el as HTMLAnchorElement;
      if (a.target === "_blank" || a.hasAttribute("download") || /^(mailto|tel):/i.test(a.getAttribute("href") ?? "")) return true; // legitimately changes nothing in this page
    }
    return false;
  }

  /** A control that, 700ms after being clicked, changed nothing: no DOM change, no navigation, no API call. */
  private watchForDeadClick(_el: HTMLElement, component: string | undefined, kind: string): void {
    const before = { m: this.mutations, p: this.pageSeq, a: this.apiCallSeq };
    setTimeout(this.safe(() => {
      if (!this.live()) return;
      if (this.mutations === before.m && this.pageSeq === before.p && this.apiCallSeq === before.a) this.track("dead_click", { component, props: { kind } });
    }), DEAD_CLICK_WAIT_MS);
  }

  // -- impressions --------------------------------------------------------------------------------------------------------------------------------

  private scanForViews(root: Element | Document): void {
    if (!this.live() || typeof IntersectionObserver === "undefined") return;
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(this.safe((entries) => entries.forEach((en) => this.onIntersect(en))), { threshold: [0, IMPRESSION_RATIO, 1] });
    }
    const found: Element[] = [];
    if (root instanceof Element && root.hasAttribute("data-track-view")) found.push(root);
    root.querySelectorAll?.("[data-track-view]").forEach((n) => found.push(n));
    for (const el of found) this.intersectionObserver.observe(el);
  }

  private onIntersect(entry: IntersectionObserverEntry): void {
    const el = entry.target;
    const visible = entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_RATIO;
    const existing = this.viewTimers.get(el);
    if (!visible) { if (existing) { clearTimeout(existing); this.viewTimers.delete(el); } return; }
    if (existing || !this.page) return;
    const pageId = this.page.id;
    this.viewTimers.set(el, setTimeout(this.safe(() => {
      this.viewTimers.delete(el);
      const component = validComponent(el.getAttribute("data-track-view"));
      if (!component || !this.page || this.page.id !== pageId || this.page.impressions.has(component)) return;
      this.page.impressions.add(component);
      this.track("impression", { component, props: { visible_ms: IMPRESSION_VISIBLE_MS } });
    }), IMPRESSION_VISIBLE_MS));
  }

  // -- forms ------------------------------------------------------------------------------------------------------------------------------------------

  private onFormEvent(e: Event, phase: "start" | "touch" | "submit"): void {
    if (!this.live() || !this.page) return;
    const target = e.target as Element | null;
    const form = target?.closest?.("[data-track-form]") as HTMLElement | null;
    const component = validComponent(form?.getAttribute("data-track-form"));
    if (!form || !component) return;
    let f = this.page.forms.get(component);
    if (phase === "start" && !f) {
      f = { startedAt: this.now(), touched: new Set(), submitted: false };
      this.page.forms.set(component, f);
      this.track("form_start", { component });
    } else if (phase === "touch" && f) {
      const name = (target as HTMLInputElement).name || (target as HTMLInputElement).id || String(f.touched.size);
      f.touched.add(name); // only a count of distinct fields leaves the browser — never the names, never the values
    } else if (phase === "submit") {
      this.finishForm(component, "ok");
    }
  }

  /** Programmatic form completion, for forms that submit through a button handler rather than a <form> submit. */
  trackFormSubmit(component: string, outcome: "ok" | "error"): void { try { this.finishForm(component, outcome); } catch { /* ignore */ } }

  private finishForm(component: string, outcome: "ok" | "error"): void {
    if (!this.live() || !this.page) return;
    const f = this.page.forms.get(component);
    this.track("form_submit", { component, props: { outcome, duration_ms: f ? Math.max(0, this.now() - f.startedAt) : 0, fields_touched: f?.touched.size ?? 0 } });
    if (f) f.submitted = true;
  }

  /** A deliberate, named interaction ("open", "select", "toggle"…) — for things a click doesn't describe. */
  trackInteraction(component: string, action: string): void { this.track("interaction", { component, props: { action } }); }

  // -- errors and API calls ----------------------------------------------------------------------------------------------------------------------------

  private onError(e: ErrorEvent | PromiseRejectionEvent, kind: "js" | "unhandled_rejection"): void {
    if (!this.live() || !this.page || this.page.errorFingerprints.size >= MAX_ERRORS_PER_PAGE) return;
    const err = ("error" in e ? e.error : (e as PromiseRejectionEvent).reason) as unknown;
    const rawName = err instanceof Error ? err.name : typeof err === "string" ? "Error" : "UnknownError";
    const name = rawName.replace(/[^A-Za-z0-9_.$ ]/g, "").slice(0, 60) || "Error";
    const apiError = name === "ApiError"; // its text comes from the server's domain messages, which can name people
    const message = apiError ? "" : sanitizeMessage(err instanceof Error ? err.message : typeof err === "string" ? err : "");
    const frame = err instanceof Error && err.stack ? (err.stack.split("\n").find((l) => /\bat\b|@/.test(l)) ?? "") : "";
    const where = frame.replace(/https?:\/\/[^/\s)]+/g, "").replace(/\?[^\s):]*/g, "").replace(/\s+/g, " ").trim();
    const fp = fingerprint(`${name}|${message}|${where}`);
    if (this.page.errorFingerprints.has(fp)) return;
    this.page.errorFingerprints.add(fp);
    const props: PropBag = { kind, name, fingerprint: fp };
    if (message) props.message = message;
    this.track("error", { props });
  }

  /** Report one API call (path, method, status, duration). The path is reduced to its shape; the query string never leaves. */
  trackApiCall(path: string, method: string, status: number, durationMs: number): void {
    try {
      if (!this.live() || !this.page) return;
      const endpoint = normalizeRoute(path);
      if (endpoint.startsWith("/api/analytics")) return; // never report on ourselves
      this.apiCallSeq++;
      if (this.page.apiCalls >= MAX_API_CALLS_PER_PAGE) return;
      this.page.apiCalls++;
      const m = method.toUpperCase();
      this.track("api_call", { props: { endpoint, method: ["GET", "POST", "PATCH", "PUT", "DELETE"].includes(m) ? m : "GET", status: Math.max(0, Math.min(599, Math.round(status))), duration_ms: Math.max(0, Math.round(durationMs)) } });
    } catch { /* ignore */ }
  }

  // -- sending ---------------------------------------------------------------------------------------------------------------------------------------------

  /** Send what's queued. Failures are retried with backoff and eventually dropped; analytics never blocks or errors the app. */
  async flush(unloading = false): Promise<void> {
    const opts = this.opts;
    if (!opts || !this.live() || this.queue.length === 0 || this.sending) return;
    if (!unloading && this.now() < this.backoffUntil) return;
    this.sending = true;
    try {
      while (this.queue.length > 0 && this.live()) {
        const batch = this.queue.splice(0, this.config.max_batch);
        const body = JSON.stringify({
          visitor_id: this.visitorId(),
          context: {
            tracker_version: TRACKER_VERSION, language: navigator.language, viewport_width: window.innerWidth,
            tz_offset_minutes: -new Date().getTimezoneOffset(),
          },
          events: batch.map(({ attempts: _a, ...wire }) => wire),
        });
        const outcome = await this.send(opts, body, unloading);
        if (outcome === "ok") { this.backoffUntil = 0; if (unloading) break; continue; }
        if (outcome === "retry") {
          const retryable = batch.map((e) => ({ ...e, attempts: e.attempts + 1 })).filter((e) => e.attempts < MAX_ATTEMPTS);
          this.queue.unshift(...retryable);
          const worst = Math.max(0, ...retryable.map((e) => e.attempts));
          this.backoffUntil = this.now() + Math.min(300_000, 5000 * 2 ** worst);
        }
        break; // "drop" (the server said this can never succeed) or "retry": stop for now
      }
    } catch (err) { this.log("flush failed", err); }
    finally { this.sending = false; }
  }

  private async send(opts: TrackerOptions, body: string, unloading: boolean): Promise<"ok" | "retry" | "drop"> {
    const url = `${opts.endpoint}/collect/`;
    try {
      if (typeof fetch === "function") {
        const token = opts.getAuthToken();
        const response = await fetch(url, {
          method: "POST", body, keepalive: true, credentials: "omit",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (response.status === 429 || response.status >= 500) return "retry";
        if (!response.ok) return "drop";
        const result = (await response.json().catch(() => null)) as { enabled?: boolean; rejected?: Array<{ index: number; reason: string }> } | null;
        if (result?.enabled === false) { this.queue = []; this.setState("disabled"); }
        if (result?.rejected?.length) this.log("server rejected events", result.rejected);
        return "ok";
      }
      if (unloading && typeof navigator.sendBeacon === "function") return navigator.sendBeacon(url, new Blob([body], { type: "text/plain" })) ? "ok" : "retry";
      return "drop";
    } catch {
      if (unloading && typeof navigator.sendBeacon === "function") {
        try { return navigator.sendBeacon(url, new Blob([body], { type: "text/plain" })) ? "ok" : "retry"; } catch { /* fall through */ }
      }
      return "retry";
    }
  }
}

export const tracker = new Tracker();
