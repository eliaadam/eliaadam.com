/*
 * REGISTER LOGISTICS in ContainerWorkspacePage.tsx — two edits (do NOT replace file).
 *
 * 1. Import the workspace shell alongside the other panels:
 */
import LogisticsWorkspace from "./panels/LogisticsWorkspace";

/*
 * 2. Add to the PANELS map (keyed by feature code), next to maicore.hr etc.:
 */

"maicore.logistics": {
  label: "Logistics",
  icon: "🚚",
  order: 50,
  slug: "logistics",
  component: LogisticsWorkspace,
},

/*
 * 3. Thread the container's uxTemplate into the rendered component so the shell
 *    picks passenger vs freight (same as HR's org_hr/family_tree):
 *
 *        <Panel.component
 *          containerId={containerId}
 *          permissions={perms}
 *          uxTemplate={workspace.uxTemplate ?? activeFeature?.ux_template}
 *        />
 *
 *    Defaults to 'passenger' (Fleet + Trips + Bookings) if none supplied. Set a
 *    cargo operator's logistics uxTemplate to 'freight' to swap the third tab to
 *    Shipments + tracking.
 *
 * NOTE: the four panels import a shared helper `./logistics-api` (logistics-api.ts).
 * Place LogisticsWorkspace.tsx, FleetPanel.tsx, TripsPanel.tsx, BookingsPanel.tsx,
 * ShipmentsPanel.tsx and logistics-api.ts together in the panels/ directory.
 */
