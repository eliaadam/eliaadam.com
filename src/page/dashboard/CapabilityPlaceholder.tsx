/**
 * Placeholder for a capability's nav route before its real page exists
 * — e.g. Document's "/dashboard/document" once `CapabilityNavLink`
 * starts rendering that link. Replace with the real routed page as
 * each capability's UI gets built; this just keeps a licensed,
 * permitted nav entry from leading to React Router's blank no-match
 * fallback in the meantime.
 */
export function CapabilityPlaceholder() {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Coming soon</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This capability is licensed and you have access to it — the page itself
        just isn't built yet.
      </p>
    </div>
  );
}
