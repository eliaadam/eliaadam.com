import CapabilityStub from "./CapabilityStub";
const step = "block mb-1";

export function InvoicingPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  void containerId;

  return (
    <CapabilityStub
      title="Invoicing"
      icon="📄"
      blurb="Issue, approve, and void invoices within this container."
      permissions={permissions}
      buildSteps={
        <>
          <span className={step}>
            1. Migration — <code>invoices</code> with root_id, container_id,
            owner_actor_id + the six ownership columns
          </span>
          <span className={step}>
            2. Model — <code>use BelongsToTenant;</code>
          </span>
          <span className={step}>
            3. Events extending <code>DomainEvent</code> (audit comes free)
          </span>
          <span className={step}>
            4. <code>InvoiceService</code> — Gate on every method,{" "}
            <code>PublishesDomainEvents</code>
          </span>
          <span className={step}>
            5. Register an <code>OwnedResource</code> (orphan queue comes free)
          </span>
          <span className={step}>
            6. Controller + routes. Replace this file.
          </span>
        </>
      }
    />
  );
}
