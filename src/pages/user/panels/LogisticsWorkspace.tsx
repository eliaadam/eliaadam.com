import { useState } from "react";

import FleetPanel from "./FleetPanel";
import TripsPanel from "./TripsPanel";
import BookingsPanel from "./BookingsPanel";
import ShipmentsPanel from "./ShipmentsPanel";

/**
 * Logistics workspace shell. One capability, two ux projections over a shared
 * fleet/trip core:
 *   - passenger → Fleet + Trips + Bookings
 *   - freight   → Fleet + Trips + Shipments (with tracking)
 *
 * Fleet (vehicles+drivers) and Trips are common to both; the third tab switches
 * on the container's uxTemplate. Every tab is permission-gated via `can`.
 */
export default function LogisticsWorkspace({
  containerId,
  permissions,
  uxTemplate = "passenger",
}: {
  containerId: string;
  permissions: string[];
  uxTemplate?: string;
}) {
  const can = (code: string) => permissions.includes(code);
  const isFreight = uxTemplate === "freight";

  const tabs = [
    {
      key: "fleet",
      label: "Fleet",
      show:
        can("system.logistics.vehicle.view") ||
        can("system.logistics.driver.view") ||
        can("system.logistics.driver.view_self"),
    },
    {
      key: "trips",
      label: "Trips",
      show:
        can("system.logistics.trip.view") ||
        can("system.logistics.trip.view_self"),
    },
    {
      key: "bookings",
      label: "Bookings",
      show:
        !isFreight &&
        (can("system.logistics.booking.view") ||
          can("system.logistics.booking.view_self")),
    },
    {
      key: "shipments",
      label: "Shipments",
      show:
        isFreight &&
        (can("system.logistics.shipment.view") ||
          can("system.logistics.shipment.view_self")),
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "fleet");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        Logistics is enabled here, but you hold no logistics permissions.
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
        {active === "fleet" && (
          <FleetPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "trips" && (
          <TripsPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "bookings" && (
          <BookingsPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "shipments" && (
          <ShipmentsPanel containerId={containerId} permissions={permissions} />
        )}
      </div>
    </div>
  );
}
