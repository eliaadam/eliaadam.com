import { useState } from "react";

import RosterPanel from "./RosterPanel";
import OrgChartPanel from "./OrgChartPanel";
import FamilyTreePanel from "./FamilyTreePanel";
import PositionsPanel from "./PositionsPanel";
import WorkforceCostPanel from "./WorkforceCostPanel";
import HrPolicyPanel from "./HrPolicyPanel";

/**
 * HR workspace shell. One capability, two ux projections over the SAME data:
 *   - org_hr      → Roster + Org chart (positions & the hire/transfer/promote
 *                   lifecycle). The institution → government view.
 *   - family_tree → Roster + Family tree (relationships). The family view.
 *
 * Roster is common to both (it's the personnel spine). The second tab switches
 * on the container's uxTemplate. Every tab is permission-gated via `can`.
 *
 * Mirrors PaymentsWorkspace/CommunicationsPanel: takes { containerId,
 * permissions, uxTemplate } and renders a tab bar over surfaces.
 */
export default function HrWorkspace({
  containerId,
  permissions,
  uxTemplate = "org_hr",
}: {
  containerId: string;
  permissions: string[];
  uxTemplate?: string;
}) {
  const can = (code: string) => permissions.includes(code);

  const isFamily = uxTemplate === "family_tree";

  const tabs = [
    {
      key: "roster",
      label: "Roster",
      show:
        can("maicore.hr.personnel.view") ||
        can("maicore.hr.personnel.view_self"),
    },
    {
      key: "org",
      label: "Org Chart",
      show:
        !isFamily &&
        (can("maicore.hr.position.view") || can("maicore.hr.assignment.view")),
    },
    {
      key: "family",
      label: "Family Tree",
      show: isFamily && can("maicore.hr.relationship.view"),
    },
    {
      key: "positions",
      label: "Positions",
      show: !isFamily && can("maicore.hr.position.view"),
    },
    {
      key: "workforce",
      label: "Workforce",
      show: !isFamily && can("maicore.hr.cost.view"),
    },
    {
      key: "policy",
      label: "Policy",
      show: can("maicore.hr.policy.view") || can("maicore.hr.policy.manage"),
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "roster");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        Human Resources is enabled here, but you hold no HR permissions.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {active === "roster" && (
          <RosterPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "org" && (
          <OrgChartPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "family" && (
          <FamilyTreePanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "positions" && (
          <PositionsPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "workforce" && (
          <WorkforceCostPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "policy" && (
          <HrPolicyPanel containerId={containerId} permissions={permissions} />
        )}
      </div>
    </div>
  );
}
