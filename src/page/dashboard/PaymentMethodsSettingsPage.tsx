import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { PaymentMethodsAdminPanel } from "../../components/payment/PaymentMethodsAdminPanel";

const selectClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/** The four purposes the existing gateway-routing work established
 * (core.payment.gateway.for.<purpose> keys) — not a registry lookup,
 * since there's no "list known purposes" endpoint anywhere yet. If
 * purposes can be added dynamically in your real system, this should
 * become a fetched list instead of a fixed one. */
const KNOWN_PURPOSES = ["marketplace", "paylink", "subscription", "pos"];

export function PaymentMethodsSettingsPage() {
  const { currentContainerId } = useContainer();
  const [purpose, setPurpose] = useState(KNOWN_PURPOSES[0]);

  if (!currentContainerId) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Select a container first.</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Payment Methods</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Which payment methods customers see for each purpose — the gateway behind them stays invisible either way.
      </p>

      <div className="mt-4">
        <label className="text-xs font-medium text-neutral-500">Purpose</label>
        <select className={`mt-1 block ${selectClass}`} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          {KNOWN_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="mt-4">
        <PaymentMethodsAdminPanel containerId={currentContainerId} purpose={purpose} />
      </div>
    </div>
  );
}
