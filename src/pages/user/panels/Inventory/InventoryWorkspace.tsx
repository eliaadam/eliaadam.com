import CatalogPanel from "./CatalogPanel";

/**
 * Inventory workspace — the catalog. One ux template ('catalog'). Products and
 * services in one list, subtyped. Marketplace (separate capability) publishes
 * from here when enabled.
 */
export default function InventoryWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <CatalogPanel containerId={containerId} permissions={permissions} />
      </div>
    </div>
  );
}
