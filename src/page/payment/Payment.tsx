import { useSearchParams } from "react-router-dom";
import { PayTab } from "./tabs/PayTab";
import { WalletsTab } from "./tabs/WalletsTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { PayoutsTab } from "./tabs/PayoutsTab";

type TabId = "pay" | "wallets" | "history" | "payouts";

const TABS: { id: TabId; label: string }[] = [
  { id: "pay", label: "Pay" },
  { id: "wallets", label: "Wallets" },
  { id: "history", label: "History" },
  { id: "payouts", label: "Payouts" },
];

/**
 * Consolidated payment page — one route (`/dashboard/payment`), tab
 * state in the URL (`?tab=...`, same pattern as every other tabbed
 * page in this app), one component file per tab under `./tabs/`.
 * Replaces what used to be four separate routes/pages
 * (Payment/PaymentWalletDetail's create form/PaymentIntentDetail/an
 * orphaned PayoutDetail route that never actually existed in App.tsx)
 * — no full navigation between any of these anymore, just a tab
 * switch. `?intent=`/`?payout=` (owned by HistoryTab/PayoutsTab
 * respectively) compose with `?tab=` in the same URL without
 * conflicting, since each only ever reads/writes its own key.
 */
export function Payment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "pay";

  const selectTab = (tab: TabId) => {
    // A tab switch clears any tab-owned selection param from whatever
    // tab is being left (?intent=/?payout=) — otherwise switching
    // from History (with an intent selected) to Payouts would carry a
    // stale, meaningless ?intent= along in the URL.
    setSearchParams({ tab });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Payments</h1>

      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`flex-none whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "pay" && <PayTab />}
        {activeTab === "wallets" && <WalletsTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "payouts" && <PayoutsTab />}
      </div>
    </div>
  );
}
