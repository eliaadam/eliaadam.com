import { useState } from "react";
import DiscoverPanel from "./DiscoverPanel";
import PublishAssetsPanel from "./PublishAssetsPanel";
import OrdersPanel from "./OrdersPanel";
import SalesPanel from "./SalesPanel";

export default function MarketplaceWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const tabs = [
    {
      key: "discover",
      label: "Discover",
      show: can("system.marketplace.listing.view"),
    },
    {
      key: "publish",
      label: "Publish",
      show: can("system.marketplace.listing.publish"),
    },
    {
      key: "orders",
      label: "My Orders",
      show: can("system.marketplace.order.view"),
    },
    {
      key: "sales",
      label: "Sales",
      show: can("system.marketplace.order.view"),
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t.key ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {active === "discover" && (
          <DiscoverPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "publish" && (
          <PublishAssetsPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "orders" && (
          <OrdersPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "sales" && (
          <SalesPanel containerId={containerId} permissions={permissions} />
        )}
      </div>
    </div>
  );
}
