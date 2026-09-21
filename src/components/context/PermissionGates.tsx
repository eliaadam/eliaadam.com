import type { ReactNode } from "react";
import {
  usePermission,
  usePermissionDecision,
} from "../../lib/hooks/usePermission";

/* -------------------------------------------------------------------------- */
/* Shared: turning a backend DenyReason into copy a person can act on         */
/* -------------------------------------------------------------------------- */

/**
 * Keys must match the `reason` string the Gate actually returns (see
 * `usePermission.ts`'s note on `AuthorizationDecision.reason`) — verify
 * against `domains/authority/domain/value_objects.py`'s `DenyReason`
 * enum values before shipping this; the keys below are my best
 * inference from `gate.py`'s symbolic names, not confirmed strings.
 */
const DENY_REASON_COPY: Record<string, string> = {
  NOT_LICENSED: "This isn't included in your plan.",
  NOT_MEMBER: "You need to join this container first.",
  NO_ROLE: "You don't have a role that grants this here.",
  SYSTEM_SCOPE: "This action is restricted to the system container.",
  UNKNOWN_PERMISSION: "This action isn't available right now.",
  CONTAINER_NOT_FOUND: "This container couldn't be found.",
};

function copyForReason(reason: string | undefined): string {
  if (!reason) return "You don't have permission to do this.";
  return DENY_REASON_COPY[reason] ?? "You don't have permission to do this.";
}

/* -------------------------------------------------------------------------- */
/* Pattern 1 — silent hide/show                                               */
/* -------------------------------------------------------------------------- */

/**
 * Use for nav items, optional sections, anything that should simply
 * not exist for someone who lacks the permission — no explanation
 * needed because they were never meant to know it was an option.
 * This is exactly what `CapabilityNavLink` already does inline; `Show`
 * is that same pattern generalized so any component can use it
 * without repeating the `isPending || !allowed` check by hand.
 *
 * <Show permission="core.payment.payment.refund">
 *   <RefundButton />
 * </Show>
 */
export function Show({
  permission,
  children,
  fallback = null,
}: {
  permission: string | null;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: allowed, isPending } = usePermission(permission);
  if (isPending || !allowed) return <>{fallback}</>;
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* Pattern 2 — visible but disabled, with the reason on hover                 */
/* -------------------------------------------------------------------------- */

/**
 * Use for an action the person plausibly EXPECTS to be able to take
 * (a button next to something they own or manage) where silently
 * hiding it would just look broken — "why is Refund missing on some
 * payments but not others?" Showing it disabled, with WHY, is more
 * honest and answers the question before it's asked.
 *
 * <PermissionButton
 *   permission="core.payment.wallet.create_shared"
 *   onClick={handleCreateSharedWallet}
 * >
 *   Create shared wallet
 * </PermissionButton>
 */
export function PermissionButton({
  permission,
  onClick,
  children,
  className,
}: {
  permission: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { data: decision, isPending } = usePermissionDecision(permission);
  const allowed = decision?.allowed ?? false;
  const reason =
    !isPending && decision && !decision.allowed
      ? copyForReason(decision.reason)
      : undefined;

  return (
    <span className="group relative inline-block">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending || !allowed}
        aria-disabled={isPending || !allowed}
        className={[
          className,
          "transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </button>

      {reason && (
        <span
          role="tooltip"
          className={[
            "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2",
            "hidden -translate-x-1/2 whitespace-nowrap rounded-md",
            "bg-foreground px-2 py-1 text-xs text-background",
            "group-hover:block group-focus-within:block",
          ].join(" ")}
        >
          {reason}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Pattern 3 — full-section gate with a reason-specific empty state           */
/* -------------------------------------------------------------------------- */

/**
 * Use to gate an entire page or panel. Rather than one generic "no
 * access" screen, this branches on WHY — a licensing gap has a
 * different remedy (upgrade) than a missing role (ask an admin) than
 * not being a member (join first). Falls back to a generic message
 * for any reason not explicitly handled, so a future DenyReason this
 * component doesn't know about yet still renders something sane
 * instead of breaking.
 *
 * <FeatureGate permission="core.payment.wallet.view">
 *   <WalletsPage />
 * </FeatureGate>
 */
export function FeatureGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { data: decision, isPending } = usePermissionDecision(permission);

  if (isPending) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Checking access…</div>
    );
  }

  if (!decision?.allowed) {
    return <AccessDeniedState reason={decision?.reason} />;
  }

  return <>{children}</>;
}

function AccessDeniedState({ reason }: { reason?: string }) {
  switch (reason) {
    case "NOT_LICENSED":
      return (
        <EmptyState
          title="Not available on your plan"
          body="Ask your container owner to upgrade to unlock this."
        />
      );
    case "NOT_MEMBER":
      return (
        <EmptyState
          title="Join this container first"
          body="You need to be a member here before you can use this."
        />
      );
    case "NO_ROLE":
      return (
        <EmptyState
          title="You don't have access"
          body="Ask a container admin for a role that includes this."
        />
      );
    default:
      return (
        <EmptyState
          title="Access denied"
          body="You don't have permission to view this."
        />
      );
  }
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 p-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composed example — the three patterns used together on one real page      */
/* -------------------------------------------------------------------------- */

/**
 * A hypothetical wallets page showing all three patterns at once:
 *   - the whole page is gated on `wallet.view` (Pattern 3)
 *   - "Create shared wallet" is visible-but-disabled-with-reason,
 *     since it's the exact permission the container-owner wildcard
 *     bug affected (Pattern 2)
 *   - "Refund" only appears at all for people who could ever use it
 *     (Pattern 1) — refunding isn't something a Collector should even
 *     see as an option
 */
export function WalletsPageExample() {
  return (
    <FeatureGate permission="core.payment.wallet.view">
      <div className="flex items-center justify-between p-6">
        <h1 className="text-lg font-semibold text-foreground">Wallets</h1>

        <PermissionButton
          permission="core.payment.wallet.create_shared"
          onClick={() => {
            /* open create-shared-wallet dialog */
          }}
          className="rounded-lg bg-brand-blue-500 px-3 py-2 text-sm font-medium text-white"
        >
          Create shared wallet
        </PermissionButton>
      </div>

      {/* ...wallet list... */}

      <Show permission="core.payment.payment.refund">
        <PermissionButton
          permission="core.payment.wallet.create_shared"
          onClick={() => {
            /* open create-shared-wallet dialog */
          }}
          className="rounded-lg bg-brand-blue-500 px-3 py-2 text-sm font-medium text-white"
        >
          Create shared wallet
        </PermissionButton>
      </Show>
    </FeatureGate>
  );
}
