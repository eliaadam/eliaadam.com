import PluginSlot from "./PluginSlot";

/**
 * PluginsPanel — the simplest workspace surface: a "Plugins" tab that renders
 * every installed plugin filling the `container.tab` slot. Add it to
 * AppsWorkspace (or the container workspace) as a tab. Later you can place
 * <PluginSlot slot="dashboard.widget" /> etc. in other areas for richer surfaces.
 */
export default function PluginsPanel({
  containerId,
}: {
  containerId: string;
  permissions?: string[];
}) {
  return <PluginSlot containerId={containerId} slot="container.tab" />;
}
