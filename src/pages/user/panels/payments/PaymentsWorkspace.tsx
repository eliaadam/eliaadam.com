import { useState, type JSX } from "react";
import PaymentsPanel from "./PaymentsPanel";
import PayoutsPanel from "./PayoutsPanel";
import CardsPanel from "../CardsPanel";
import DepositPanel from "./DepositPanel";
import PaymentLinksPanel from "./PaymentLinksPanel";

type TabDef = {
  key: string;
  label: string;
  show: boolean;
  render: () => JSX.Element;
};

export default function PaymentsWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
  isAdmin?: boolean;
}) {
  const hasPay = (p: string) => permissions.includes(`payments.${p}`);
  const hasVcn = (p: string) => permissions.includes(`vcn.${p}`);

  const tabs: TabDef[] = [
    {
      key: "money-in",
      label: "Money in",
      show: hasPay("wallet.view") || hasPay("payment.create"),
      render: () => (
        <PaymentsPanel containerId={containerId} permissions={permissions} />
      ),
    },
    {
      // NEW: top up this container's wallet from mobile money (USSD).
      key: "deposit",
      label: "Deposit",
      show: hasPay("payment.create"),
      render: () => <DepositPanel containerId={containerId} />,
    },
    {
      key: "payouts",
      label: "Payouts",
      show: hasPay("payout.request") || hasPay("payout.view"),
      render: () => (
        <PayoutsPanel containerId={containerId} permissions={permissions} />
      ),
    },
    {
      key: "cards",
      label: "Cards",
      show: hasVcn("card.view") || hasVcn("card.issue"),
      render: () => (
        <CardsPanel containerId={containerId} permissions={permissions} />
      ),
    },
    {
      // NEW: shareable payment links (create/manage), backed by the new
      // payment_links flow. Replaces the old LinksPanel.
      key: "links",
      label: "Links",
      show: hasPay("link.view") || hasPay("link.manage"),
      render: () => <PaymentLinksPanel containerId={containerId} />,
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "money-in");

  if (tabs.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        You don't have access to payments in this container.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-xs font-semibold -mb-px border-b-2 transition-colors ${
              active === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.key === active)?.render()}
    </div>
  );
}
