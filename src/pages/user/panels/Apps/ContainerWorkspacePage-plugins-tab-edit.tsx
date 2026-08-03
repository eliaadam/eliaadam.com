/*
 * Add a "Plugins" tab to the workspace so installed plugins render.
 *
 * OPTION A (simplest) — add PluginsPanel as a tab in AppsWorkspace.tsx:
 *
 *   import PluginsPanel from "./PluginsPanel";
 *   // in the tabs array:
 *   { key: "plugins", label: "Plugins", show: can("maicore.apps.installation.view") },
 *   // in the body switch:
 *   {active === "plugins" && <PluginsPanel containerId={containerId} />}
 *
 * OPTION B — a top-level workspace tab (any container, not just Apps):
 *   In ContainerWorkspacePage PANELS, add an entry that renders
 *   <PluginSlot slot="container.tab" containerId={containerId} />.
 *
 * OPTION C — embed plugins INSIDE other panels (richer):
 *   Place <PluginSlot slot="inventory.panel" containerId={containerId} /> at the
 *   bottom of the Inventory workspace, etc. Each capability panel becomes a
 *   surface plugins can extend. This is the "ecosystem" version — do it once the
 *   basic tab works.
 *
 * For the DEVELOPER upload UI, add PluginManagerSection under each app row in
 * DeveloperAppsPanel.tsx:
 *
 *   import PluginManagerSection from "./PluginManagerSection";
 *   // under each app's row (needs the app's granted/requested scopes list):
 *   <PluginManagerSection containerId={containerId} appId={a.id} appScopes={SCOPES} />
 *   // where SCOPES is the scope codes the app requested (from /scopes or the app).
 */
