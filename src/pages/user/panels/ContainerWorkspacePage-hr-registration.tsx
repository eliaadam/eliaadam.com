/*
 * REGISTER HR in ContainerWorkspacePage.tsx
 *
 * Two edits to the existing file (do NOT replace the whole file):
 *
 * 1. Import the HR workspace shell at the top, alongside the other panels:
 */
import HrWorkspace from "./panels/HrWorkspace";

/*
 * 2. Add an entry to the panel map (the PANELS object keyed by feature code),
 *    next to payments/communications/etc. NOTE: HrWorkspace needs the container's
 *    uxTemplate to choose org_hr vs family_tree — if your workspace payload
 *    already carries a per-feature or per-container uxTemplate, pass it through;
 *    otherwise it defaults to 'org_hr'.
 *
 *    Add this line inside the PANELS object:
 */

"maicore.hr": {
  label: "Human Resources",
  icon: "👥",
  order: 45,
  slug: "hr",
  component: HrWorkspace,
},

/*
 * 3. If the workspace payload exposes a uxTemplate for the container/feature,
 *    thread it into the rendered component. Where the page renders the active
 *    panel's component (something like:
 *        <Panel.component containerId={containerId} permissions={perms} />
 *    ), pass uxTemplate for HR:
 *
 *        <Panel.component
 *          containerId={containerId}
 *          permissions={perms}
 *          uxTemplate={workspace.uxTemplate ?? activeFeature?.ux_template}
 *        />
 *
 *    HrWorkspace ignores uxTemplate for the roster tab and only uses it to pick
 *    Org Chart (org_hr) vs Family Tree (family_tree). If you don't yet surface a
 *    uxTemplate, HR still works — it defaults to org_hr (Roster + Org Chart).
 *    For family containers, set the container's HR uxTemplate to 'family_tree'
 *    (via the container's feature config / ContainerUxController) to flip the
 *    second tab to the family tree.
 */
