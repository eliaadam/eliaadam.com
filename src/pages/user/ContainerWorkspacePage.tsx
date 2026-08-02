import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DocumentsPanel from "./panels/DocumentsPanel";
import { InvoicingPanel } from "./panels/InvoicingPanel";
import ProjectsPanel from "./panels/ProjectsPanel";
import MembersPanel from "./panels/MembersPanel";
import CommunicationsPanel from "./panels/CommunicationsPanel";
import ContainerManagementPanel from "./panels/ContainerManagementPanel";
import HrWorkspace from "./panels/HrWorkspace";
import { UxTemplateProvider, useUxTemplate } from "./ux/UxTemplateProvider";
import PaymentsWorkspace from "./panels/PaymentsWorkspace";
import KycPanel from "./panels/KycPanel";
import LogisticsWorkspace from "./panels/LogisticsWorkspace";
import MarketplaceWorkspace from "./panels/Marketplace/MarketplaceWorkspace";
import InventoryWorkspace from "./panels/Inventory/InventoryWorkspace";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchWorkspace(containerId: string) {
  const res = await fetch(
    `${API}/api/hierarchy/containers/${containerId}/workspace`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("maicore_token")}`,
      },
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return json.data as Workspace;
}

/** Resolve a public slug to a container id. Returns null on miss. */
async function resolveSlug(
  slug: string,
): Promise<{ id: string; type: string } | null> {
  const res = await fetch(
    `${API}/api/hierarchy/public/resolve/${encodeURIComponent(slug)}`,
    {
      headers: { Accept: "application/json" },
    },
  );
  const body = await res.json().catch(() => ({}));
  if (res.status === 404) return null;
  if (body?.data?.redirect)
    return { id: `redirect:${body.data.redirect}`, type: "redirect" };
  if (body?.data?.id) return { id: body.data.id, type: body.data.type };
  return null;
}

type Family = { code: string; display_name: string; icon: string | null };

type Capability = {
  code: string;
  display_name: string;
  description: string | null;
  family: Family | null;
  tier: string | null;
  has_frontend: boolean;
  ux_template: string;
  access_mode: "role_required" | "open_to_members";
  permissions: string[];
  resources: string[];
};

type Workspace = {
  container: {
    id: string;
    code: string;
    display_name: string;
    tenant_container_id: string;
    is_root: boolean;
    ux_template: string;
    slug?: string | null;
  };
  capabilities: Capability[];
};

const PANELS: Record<
  string,
  {
    label: string;
    icon: string;
    order: number;
    /** URL-safe short name for this panel in the path, e.g. /acme/payments. */
    slug: string;
    component: React.ComponentType<{
      containerId: string;
      permissions: string[];
      uxTemplate?: string;
    }>;
  }
> = {
  "maicore.membership": {
    label: "Members",
    icon: "👥",
    order: 0,
    slug: "members",
    component: MembersPanel,
  },
  "maicore.communications": {
    label: "Communications",
    icon: "💬",
    order: 5,
    slug: "chat",
    component: CommunicationsPanel,
  },
  documents: {
    label: "Documents",
    icon: "📁",
    order: 10,
    slug: "documents",
    component: DocumentsPanel,
  },
  invoice: {
    label: "Invoicing",
    icon: "📄",
    order: 20,
    slug: "invoicing",
    component: InvoicingPanel,
  },
  project: {
    label: "Projects",
    icon: "📋",
    order: 30,
    slug: "projects",
    component: ProjectsPanel,
  },
  payments: {
    label: "Payments",
    icon: "💰",
    order: 40,
    slug: "payments",
    component: PaymentsWorkspace,
  },
  kyc: {
    label: "KYC",
    icon: "🪪",
    order: 45,
    slug: "kyc",
    component: KycPanel,
  },
  "maicore.hierarchy": {
    label: "Manage",
    icon: "⚙️",
    order: 90,
    slug: "manage",
    component: ContainerManagementPanel,
  },
  "maicore.hr": {
    label: "Human Resources",
    icon: "👥",
    order: 45,
    slug: "hr",
    component: HrWorkspace,
  },
  "maicore.logistics": {
    label: "Logistics",
    icon: "🚚",
    order: 50,
    slug: "logistics",
    component: LogisticsWorkspace,
  },
  "maicore.marketplace": {
    label: "Marketplace",
    icon: "🏪",
    order: 70,
    slug: "marketplace",
    component: MarketplaceWorkspace,
  },
  "maicore.inventory": {
    label: "Inventory",
    icon: "📦",
    order: 60,
    slug: "inventory",
    component: InventoryWorkspace,
  },
};

/** panel slug (from URL) → capability code */
const PANEL_SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PANELS).map(([code, p]) => [p.slug, code]),
);

export default function ContainerWorkspacePage() {
  // Either route param may be present:
  //   /u/workspace/:containerId       → containerId is a UUID
  //   /:slug/:panel                   → slug is a vanity slug, panel is a tab
  const params = useParams<{
    containerId?: string;
    slug?: string;
    panel?: string;
  }>();
  const navigate = useNavigate();

  const rawId = params.containerId ?? params.slug ?? "";
  const isUuid = UUID_RE.test(rawId);

  // When the path holds a slug, resolve it to a container id first.
  const [resolvedId, setResolvedId] = useState<string | null>(
    isUuid ? rawId : null,
  );
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (isUuid) {
      setResolvedId(rawId);
      return;
    }

    setResolvedId(null);
    setResolveError(null);

    resolveSlug(rawId).then((r) => {
      if (cancelled) return;
      if (r === null) {
        setResolveError("notfound");
      } else if (r.type === "redirect") {
        const to = r.id.replace(/^redirect:/, "");

        const segments = window.location.pathname.split("/").filter(Boolean);
        const panelInUrl = segments[1]; // /{slug}/{panel}
        navigate(`/${to}${panelInUrl ? `/${panelInUrl}` : ""}`, {
          replace: true,
        });
      } else {
        setResolvedId(r.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rawId, isUuid]);

  const workspaceQuery = useQuery({
    queryKey: ["workspace", resolvedId],
    queryFn: () => fetchWorkspace(resolvedId!),
    enabled: !!resolvedId,

    staleTime: 30_000,
  });

  if (resolveError === "notfound") {
    return (
      <div className="p-8">
        <div className="max-w-md">
          <h2 className="text-base font-semibold text-black dark:text-white mb-2">
            Address not found
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            No container is registered at <code>/{rawId}</code>.
          </p>
          <Link
            to="/home"
            className="text-sm font-semibold text-black dark:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>
    );
  }

  if (!resolvedId || workspaceQuery.isLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading workspace…
        </p>
      </div>
    );
  }

  if (workspaceQuery.isError) {
    const status = (workspaceQuery.error as any)?.status;
    return (
      <div className="p-8">
        <div className="max-w-md">
          <h2 className="text-base font-semibold text-black dark:text-white mb-2">
            {status === 403 ? "No access" : "Container not found"}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {status === 403
              ? "You are not a member of this container."
              : (workspaceQuery.error as Error).message}
          </p>
          <Link
            to="/home"
            className="text-sm font-semibold text-black dark:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>
    );
  }

  const workspace = workspaceQuery.data!;

  return (
    <UxTemplateProvider template={workspace.container.ux_template}>
      <WorkspaceBody
        workspace={workspace}
        containerId={resolvedId}
        addressBase={
          workspace.container.slug
            ? `/${workspace.container.slug}`
            : `/u/workspace/${resolvedId}`
        }
        panelSlugFromUrl={params.panel ?? null}
      />
    </UxTemplateProvider>
  );
}

function WorkspaceBody({
  workspace,
  containerId,
  addressBase,
  panelSlugFromUrl,
}: {
  workspace: Workspace;
  containerId: string;
  addressBase: string;
  panelSlugFromUrl: string | null;
}) {
  const { layout, template } = useUxTemplate();
  const navigate = useNavigate();

  const capabilities = workspace.capabilities ?? [];
  const renderable = capabilities
    .filter((c) => PANELS[c.code])
    .sort((a, b) => PANELS[a.code].order - PANELS[b.code].order);

  const backendOnly = capabilities.filter(
    (c) => !PANELS[c.code] && c.has_frontend === false,
  );
  const notBuilt = capabilities.filter(
    (c) => !PANELS[c.code] && c.has_frontend !== false,
  );

  const codeFromUrl = panelSlugFromUrl
    ? PANEL_SLUG_TO_CODE[panelSlugFromUrl]
    : undefined;
  const active =
    codeFromUrl && renderable.some((c) => c.code === codeFromUrl)
      ? codeFromUrl
      : (renderable[0]?.code ?? null);

  const goToPanel = (code: string) => {
    const panelSlug = PANELS[code]?.slug;
    if (!panelSlug) return;

    navigate(`${addressBase}/${panelSlug}`);
  };

  useEffect(() => {
    if (!active) return;

    const panelSlug = panelSlugFromUrl ?? PANELS[active]?.slug;
    if (!panelSlug) return;

    const canonical = `${addressBase}/${panelSlug}`;
    if (window.location.pathname !== canonical) {
      navigate(canonical, { replace: true });
    }
  }, [panelSlugFromUrl, active, addressBase]);

  const activeCapability = renderable.find((c) => c.code === active);
  const ActivePanel = active ? PANELS[active]?.component : null;

  const labelFor = (cap: Capability) =>
    PANELS[cap.code]?.label ?? cap.display_name;
  const iconFor = (cap: Capability) =>
    PANELS[cap.code]?.icon ?? cap.family?.icon ?? "▪";

  const renderActivePanel = () =>
    ActivePanel && activeCapability ? (
      <ActivePanel
        key={activeCapability.code}
        containerId={containerId}
        permissions={activeCapability.permissions}
        uxTemplate={activeCapability.ux_template ?? "standard"}
      />
    ) : null;

  return (
    <div style={{ padding: "var(--ux-panel-pad, 2rem)" }}>
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1
            className="font-semibold text-black dark:text-white m-0"
            style={{ fontSize: "var(--ux-font-heading)" }}
          >
            {workspace.container.display_name}
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
            {workspace.container.code}
          </span>
          {workspace.container.slug && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
              title="Public address"
            >
              /{workspace.container.slug}
            </span>
          )}
          {workspace.container.is_root && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
              root
            </span>
          )}
          {template !== "standard" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
              title="Presentation template"
            >
              {template}
            </span>
          )}
        </div>
      </header>

      {capabilities.length === 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <p className="text-sm font-medium text-black dark:text-white mb-1">
            No capabilities here yet
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
            Nothing has been enabled for this container, or you hold no
            permissions in the capabilities that have been.
          </p>
        </div>
      )}

      {renderable.length > 0 && layout === "tabs" && (
        <TabsShell
          renderable={renderable}
          active={active}
          goToPanel={goToPanel}
          labelFor={labelFor}
          iconFor={iconFor}
        >
          {renderActivePanel()}
        </TabsShell>
      )}

      {renderable.length > 0 && layout === "grid" && (
        <GridShell
          renderable={renderable}
          active={active}
          goToPanel={goToPanel}
          labelFor={labelFor}
          iconFor={iconFor}
          addressBase={addressBase}
        >
          {renderActivePanel()}
        </GridShell>
      )}

      {renderable.length > 0 && layout === "dashboard" && (
        <DashboardShell
          renderable={renderable}
          active={active}
          goToPanel={goToPanel}
          labelFor={labelFor}
          iconFor={iconFor}
        >
          {renderActivePanel()}
        </DashboardShell>
      )}

      {notBuilt.length > 0 && (
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Enabled, no interface yet
          </p>
          <div className="flex flex-wrap gap-2">
            {notBuilt.map((cap) => (
              <span
                key={cap.code}
                className="px-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-400"
                title={`${cap.code} — ${cap.permissions.length} permission(s)`}
              >
                {cap.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {backendOnly.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Running in the background
          </p>
          <div className="flex flex-wrap gap-2">
            {backendOnly.map((cap) => (
              <span
                key={cap.code}
                className="px-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-400"
                title={cap.description ?? cap.code}
              >
                {cap.display_name}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400 mt-2 mb-0">
            These have no screen by design — they work through other features.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Shells (now navigate instead of setState) ────────────────────── */

type ShellProps = {
  renderable: Capability[];
  active: string | null;
  goToPanel: (code: string) => void;
  labelFor: (c: Capability) => string;
  iconFor: (c: Capability) => string;
  children: React.ReactNode;
  addressBase?: string;
};

function TabsShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
}: ShellProps) {
  return (
    <>
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-6 overflow-x-auto">
        {renderable.map((cap) => {
          const on = cap.code === active;
          return (
            <button
              key={cap.code}
              onClick={() => goToPanel(cap.code)}
              title={cap.description ?? undefined}
              className={`font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                on
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
              style={{
                fontSize: "var(--ux-font-base)",
                padding:
                  "calc(var(--ux-space-unit) * 2.5) var(--ux-control-pad-x)",
              }}
            >
              <span className="mr-1.5">{iconFor(cap)}</span>
              {labelFor(cap)}
              {cap.access_mode === "open_to_members" && (
                <span
                  className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
                  title="Open to every member"
                >
                  open
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </>
  );
}

function GridShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
  addressBase,
}: ShellProps) {
  const navigate = useNavigate();
  const activeCap = renderable.find((c) => c.code === active);

  if (activeCap) {
    return (
      <div>
        <button
          onClick={() => addressBase && navigate(addressBase)}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
          style={{
            fontSize: "var(--ux-font-lg)",
            minHeight: "var(--ux-tap-min)",
            padding: "0 var(--ux-control-pad-x)",
          }}
        >
          ← All apps
        </button>
        <div className="flex items-center gap-2 mb-4">
          <span style={{ fontSize: "var(--ux-font-heading)" }}>
            {iconFor(activeCap)}
          </span>
          <h2
            className="font-semibold text-black dark:text-white m-0"
            style={{ fontSize: "var(--ux-font-heading)" }}
          >
            {labelFor(activeCap)}
          </h2>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
    >
      {renderable.map((cap) => (
        <button
          key={cap.code}
          onClick={() => goToPanel(cap.code)}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          style={{ minHeight: "9rem", padding: "var(--ux-panel-pad)" }}
        >
          <span style={{ fontSize: "3rem", lineHeight: 1 }}>
            {iconFor(cap)}
          </span>
          <span
            className="font-semibold text-black dark:text-white text-center"
            style={{ fontSize: "var(--ux-font-lg)" }}
          >
            {labelFor(cap)}
          </span>
        </button>
      ))}
    </div>
  );
}

function DashboardShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
}: ShellProps) {
  const activeCap = renderable.find((c) => c.code === active);
  return (
    <div>
      <div
        className="grid gap-4 mb-8"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {renderable.map((cap) => {
          const on = cap.code === active;
          return (
            <button
              key={cap.code}
              onClick={() => goToPanel(cap.code)}
              className={`text-left rounded-2xl border transition ${
                on
                  ? "border-black dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
              style={{ padding: "var(--ux-panel-pad)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: "var(--ux-font-lg)" }}>
                  {iconFor(cap)}
                </span>
                <span
                  className="font-semibold text-black dark:text-white"
                  style={{ fontSize: "var(--ux-font-lg)" }}
                >
                  {labelFor(cap)}
                </span>
              </div>
              {cap.description && (
                <p
                  className="text-neutral-500 dark:text-neutral-400 m-0"
                  style={{ fontSize: "var(--ux-font-sm)" }}
                >
                  {cap.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {activeCap && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: "var(--ux-font-heading)" }}>
              {iconFor(activeCap)}
            </span>
            <h2
              className="font-semibold text-black dark:text-white m-0"
              style={{ fontSize: "var(--ux-font-heading)" }}
            >
              {labelFor(activeCap)}
            </h2>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
