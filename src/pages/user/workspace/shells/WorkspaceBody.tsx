import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUxTemplate } from "../../ux/UxTemplateProvider";
import { NotBuiltList, BackendOnlyList } from "../CapabilityBadgeLists";
import { PANELS, PANEL_SLUG_TO_CODE, FALLBACK_ICON } from "../panels.config";
import type { Workspace, Capability } from "../types";
import { WorkspaceHeader } from "../WorkspaceHeader";
import { DashboardShell } from "./DashboardShell";
import { GridShell } from "./GridShell";
import { TabsShell } from "./TabsShell";

interface WorkspaceBodyProps {
  workspace: Workspace;
  containerId: string;
  addressBase: string;
  panelSlugFromUrl: string | null;
}

export function WorkspaceBody({
  workspace,
  containerId,
  addressBase,
  panelSlugFromUrl,
}: WorkspaceBodyProps) {
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
  }, [panelSlugFromUrl, active, addressBase, navigate]);

  const activeCapability = renderable.find((c) => c.code === active);
  const ActivePanel = active ? PANELS[active]?.component : null;

  const labelFor = (cap: Capability) =>
    PANELS[cap.code]?.label ?? cap.display_name;
  const iconFor = (cap: Capability) => PANELS[cap.code]?.icon ?? FALLBACK_ICON;

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
      <WorkspaceHeader container={workspace.container} template={template} />

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

      <NotBuiltList capabilities={notBuilt} />
      <BackendOnlyList capabilities={backendOnly} />
    </div>
  );
}
