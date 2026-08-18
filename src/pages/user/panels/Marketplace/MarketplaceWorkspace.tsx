import { useState, type JSX } from "react";
import DiscoverPanel from "./DiscoverPanel";
import PublishAssetsPanel from "./PublishAssetsPanel";
import OrdersPanel from "./OrdersPanel";
import SalesPanel from "./SalesPanel";

type TabDef = {
  key: string;
  label: string;
  show: boolean;
  render: () => JSX.Element;
};

/**
 * The buy flow (wallet vs USSD via MarketplaceCheckout) is per-listing and lives
 * inside DiscoverPanel / the order detail — not a workspace tab. This shell just
 * routes between the marketplace sections; refactored to the shared TabDef
 * render() pattern for consistency with PaymentsWorkspace.
 */
export default function MarketplaceWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);

  const tabs: TabDef[] = [
    {
      key: "discover",
      label: "Discover",
      show: can("system.marketplace.listing.view"),
      render: () => (
        <DiscoverPanel containerId={containerId} permissions={permissions} />
      ),
    },
    {
      key: "publish",
      label: "Publish",
      show: can("system.marketplace.listing.publish"),
      render: () => (
        <PublishAssetsPanel
          containerId={containerId}
          permissions={permissions}
        />
      ),
    },
    {
      key: "orders",
      label: "My Orders",
      show: can("system.marketplace.order.view"),
      render: () => (
        <OrdersPanel containerId={containerId} permissions={permissions} />
      ),
    },
    {
      key: "sales",
      label: "Sales",
      show: can("system.marketplace.order.view"),
      render: () => (
        <SalesPanel containerId={containerId} permissions={permissions} />
      ),
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "discover");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have marketplace access here.
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
        {tabs.find((t) => t.key === active)?.render()}
      </div>
    </div>
  );
}
