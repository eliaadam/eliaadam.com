import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Archive,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { sdk, type Listing } from "../../lib/sdk";
import { API_BASE_URL } from "../../lib/query/Api";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageMarketplaceListings } from "../../lib/hooks/useCanManageMarketplaceListings";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function formatPrice(price: number, currency: string) {
  return `${currency} ${(price / 100).toFixed(2)}`;
}

export function Marketplace() {
  const { currentContainerId } = useContainer();
  const { data: canManage } = useCanManageMarketplaceListings();
  const [activeTab, setActiveTab] = useState<"manage" | "browse">("browse");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data: myListings } = useQuery({
    queryKey: ["surfacing", "listings", currentContainerId],
    queryFn: () =>
      sdk.surfacing.listListingsForContainer(currentContainerId!, "active"),
    enabled: Boolean(currentContainerId && canManage),
  });

  const { data: draftListings } = useQuery({
    queryKey: ["surfacing", "listings-draft", currentContainerId],
    queryFn: () =>
      sdk.surfacing.listListingsForContainer(currentContainerId!, "draft"),
    enabled: Boolean(currentContainerId && canManage),
  });

  const { data: browseResults, isLoading: browseLoading } = useQuery({
    queryKey: ["surfacing", "marketplace", search],
    queryFn: () => sdk.surfacing.browseMarketplace(search || undefined),
  });

  const showManageTab = canManage && currentContainerId;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight">Marketplace</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Buy and sell anything a capability lets an actor own — templates,
        access, anything with an id.
      </p>

      {showManageTab && (
        <div className="mt-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "manage"
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
            }`}
          >
            Manage listings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("browse")}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
            }`}
          >
            Browse
          </button>
        </div>
      )}

      {showManageTab && activeTab === "manage" && (
        <section className="mt-6">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              This container's listings
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className={`flex flex-none items-center gap-1.5 ${primaryButtonClass}`}
            >
              <Plus size={15} />
              New listing
            </button>
          </div>

          {showCreate && (
            <CreateListingForm
              containerId={currentContainerId}
              onDone={() => setShowCreate(false)}
            />
          )}

          {(draftListings?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Drafts — not visible in the marketplace yet
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {draftListings!.map((listing) => (
                  <ManagedListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}

          {(myListings?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Active
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {myListings!.map((listing) => (
                  <ManagedListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}

          {!draftListings?.length && !myListings?.length && !showCreate && (
            <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
              <ShoppingBag
                className="mx-auto text-neutral-400 dark:text-neutral-600"
                size={22}
              />
              <p className="mt-3 text-sm font-medium">
                No listings on this container yet
              </p>
            </div>
          )}
        </section>
      )}

      {(!showManageTab || activeTab === "browse") && (
        <section className={showManageTab ? "mt-6" : "mt-8"}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Browse</h2>
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Search listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {browseLoading && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
                />
              ))}
            </div>
          )}

          {browseResults && browseResults.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
              <ShoppingBag
                className="mx-auto text-neutral-400 dark:text-neutral-600"
                size={22}
              />
              <p className="mt-3 text-sm font-medium">Nothing here yet</p>
            </div>
          )}

          {browseResults && browseResults.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {browseResults.map((listing) => (
                <BrowseListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ManagedListingCard({ listing }: { listing: Listing }) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["surfacing"] });

  const publishMutation = useMutation({
    mutationFn: () => sdk.surfacing.publishListing(listing.id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.surfacing.archiveListing(listing.id),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{listing.title}</p>
        <button
          type="button"
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
          aria-label="Archive listing"
          className="text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
        >
          <Archive size={14} />
        </button>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        {formatPrice(listing.price, listing.currency)} ·{" "}
        {listing.source_capability}/{listing.source_type}
      </p>
      {listing.status === "draft" && (
        <button
          type="button"
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
          className="self-start rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {publishMutation.isPending ? "Publishing…" : "Publish"}
        </button>
      )}
    </div>
  );
}

function ListingImageCarousel({ fileIds }: { fileIds: string[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  // `listing.images` entries are Document file_ids (opaque references,
  // set by listing_service.py's create() when seeding from a General
  // Inventory item's branding assets), not direct URLs — resolved the
  // same way Inventory's own branding tiles already do. Each image is
  // tracked independently for failure, so one dead file_id just gets
  // skipped in the rotation rather than breaking the whole carousel.
  const validIndices = fileIds.map((_, i) => i).filter((i) => !failed.has(i));

  if (validIndices.length === 0) return null;

  const currentIndex = validIndices.includes(index) ? index : validIndices[0];

  const step = (direction: 1 | -1) => {
    const pos = validIndices.indexOf(currentIndex);
    const nextPos =
      (pos + direction + validIndices.length) % validIndices.length;
    setIndex(validIndices[nextPos]);
  };

  return (
    <div className="group relative">
      <img
        src={`${API_BASE_URL}/api/document/files/${fileIds[currentIndex]}/raw/`}
        alt=""
        onError={() => setFailed((prev) => new Set(prev).add(currentIndex))}
        className="h-32 w-full rounded-md object-cover"
      />
      {validIndices.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous image"
            className="absolute left-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next image"
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {validIndices.map((i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BrowseListingCard({ listing }: { listing: Listing }) {
  const [showBuy, setShowBuy] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      {listing.images.length > 0 && (
        <ListingImageCarousel fileIds={listing.images} />
      )}
      <p className="text-sm font-semibold">{listing.title}</p>
      <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {listing.pricing_mode === "free"
          ? "Free"
          : listing.pricing_mode === "subscription"
            ? `${formatPrice(listing.price, listing.currency)} · Subscription`
            : formatPrice(listing.price, listing.currency)}
      </p>
      {listing.description && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {listing.description}
        </p>
      )}

      <div className="mt-auto pt-2">
        {showBuy ? (
          <BuyForm listing={listing} onDone={() => setShowBuy(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowBuy(true)}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
          >
            Buy
          </button>
        )}
      </div>
    </div>
  );
}

function BuyForm({
  listing,
  onDone,
}: {
  listing: Listing;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { currentContainerId } = useContainer();
  const [walletId, setWalletId] = useState("");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.surfacing.purchase({
        listing_id: listing.id,
        paying_wallet_id: walletId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surfacing"] });
    },
  });

  const result = mutation.data;

  if (result) {
    if (result.status === "completed") {
      return (
        <div className="flex items-start gap-1.5 text-xs text-black dark:text-white">
          <CheckCircle2 size={14} className="mt-0.5 flex-none" />
          <span>
            {listing.pricing_mode === "free"
              ? "It's yours. Check your account for access."
              : "Purchased. Check your account for access."}
          </span>
        </div>
      );
    }
    if (result.status === "subscribed") {
      return (
        <div className="flex items-start gap-1.5 text-xs text-black dark:text-white">
          <CheckCircle2 size={14} className="mt-0.5 flex-none" />
          <span>Subscribed. You'll be billed on the plan's own schedule.</span>
        </div>
      );
    }
    if (result.status === "fulfillment_failed") {
      return (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          <span>
            Payment succeeded, but something went wrong granting access. Contact
            the seller.
          </span>
        </div>
      );
    }
    if (result.status === "subscription_failed") {
      return (
        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          <span>
            Couldn't set up the subscription — check the wallet has enough
            balance and try again.
          </span>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!currentContainerId ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Select a container first to choose a wallet to pay from.
        </p>
      ) : (
        <>
          <select
            className={`${inputClass} w-full`}
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            <option value="">
              {listing.pricing_mode === "free"
                ? "Account to use…"
                : "Pay from…"}
            </option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label || w.owner_type} ({w.currency}{" "}
                {(w.balance / 100).toFixed(2)})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={!walletId || mutation.isPending}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {mutation.isPending
                ? listing.pricing_mode === "subscription"
                  ? "Subscribing…"
                  : "Buying…"
                : listing.pricing_mode === "free"
                  ? "Get it free"
                  : listing.pricing_mode === "subscription"
                    ? "Subscribe"
                    : "Confirm"}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't complete the purchase — check the wallet has enough balance.
        </p>
      )}
    </div>
  );
}

function CreateListingForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  // Source mode — either seed from an existing General Inventory item
  // (snapshot at creation time, not a live reference — see the
  // backend's own note on this) or reference something else manually
  // (e.g. a Provisioning template, which has no Inventory item behind
  // it at all).
  const [sourceMode, setSourceMode] = useState<"inventory" | "manual">(
    "inventory",
  );
  const [inventoryItemId, setInventoryItemId] = useState("");

  const [sourceCapability, setSourceCapability] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payoutWalletId, setPayoutWalletId] = useState("");

  const [pricingMode, setPricingMode] = useState<
    "free" | "one_time" | "subscription"
  >("one_time");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", containerId],
    queryFn: () => sdk.payment.listWallets(containerId),
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory", "items", containerId],
    queryFn: () => sdk.inventory.listItems(containerId, "active"),
    enabled: sourceMode === "inventory",
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription", "plans", containerId],
    queryFn: () => sdk.subscription.listPlansForContainer(containerId),
    enabled: pricingMode === "subscription",
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.surfacing.createListing({
        container_id: containerId,
        payout_wallet_id: payoutWalletId,
        pricing_mode: pricingMode,
        subscription_plan_id:
          pricingMode === "subscription" ? subscriptionPlanId : undefined,
        ...(sourceMode === "inventory"
          ? { inventory_item_id: inventoryItemId }
          : {
              source_capability: sourceCapability,
              source_type: sourceType,
              source_id: sourceId,
              title,
              description,
              price:
                pricingMode === "free" ? 0 : Math.round(Number(price) * 100),
              currency: currency.toUpperCase(),
            }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surfacing"] });
      onDone();
    },
  });

  const canSubmit =
    Boolean(payoutWalletId) &&
    (pricingMode !== "subscription" || Boolean(subscriptionPlanId)) &&
    (sourceMode === "inventory"
      ? Boolean(inventoryItemId)
      : Boolean(title) &&
        Boolean(sourceCapability) &&
        Boolean(sourceType) &&
        Boolean(sourceId) &&
        (pricingMode === "free" || Boolean(price)));

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
          What are you selling?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSourceMode("inventory")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              sourceMode === "inventory"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            From your inventory
          </button>
          <button
            type="button"
            onClick={() => setSourceMode("manual")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              sourceMode === "manual"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            Something else
          </button>
        </div>
      </div>

      {sourceMode === "inventory" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Inventory item
          </label>
          <select
            className={inputClass}
            value={inventoryItemId}
            onChange={(e) => setInventoryItemId(e.target.value)}
          >
            <option value="">Choose…</option>
            {inventoryItems?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.price.currency}{" "}
                {(item.price.total / 100).toFixed(2)})
              </option>
            ))}
          </select>
          {inventoryItems && inventoryItems.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              No published inventory items yet — publish one first, or choose
              "Something else" to list manually.
            </p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Title, description, price, and images are copied from the item when
            the listing is created — editing the item later won't change this
            listing automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Title
            </label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Description
            </label>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="rounded-md bg-neutral-50 p-3 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              What's being sold — a reference into another capability's own
              data. For example, selling access to a Provisioning template:
              capability <code>system.provisioning</code>, type{" "}
              <code>template</code>, id = the template's code.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                className={inputClass}
                placeholder="source_capability"
                value={sourceCapability}
                onChange={(e) => setSourceCapability(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="source_type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="source_id"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Pricing
        </label>
        <div className="flex gap-2">
          {(["free", "one_time", "subscription"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPricingMode(mode)}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                pricingMode === mode
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
              }`}
            >
              {mode === "free"
                ? "Free"
                : mode === "one_time"
                  ? "One-time"
                  : "Subscription"}
            </button>
          ))}
        </div>
      </div>

      {pricingMode === "subscription" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Subscription plan
          </label>
          <select
            className={inputClass}
            value={subscriptionPlanId}
            onChange={(e) => setSubscriptionPlanId(e.target.value)}
          >
            <option value="">Choose…</option>
            {plans?.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.currency} {(plan.price / 100).toFixed(2)}/
                {plan.billing_interval})
              </option>
            ))}
          </select>
          {plans && plans.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              No subscription plans on this container yet — create one under
              Subscription first.
            </p>
          )}
        </div>
      ) : (
        sourceMode === "manual" &&
        pricingMode !== "free" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Price
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Currency
              </label>
              <input
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>
        )
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Payout wallet
        </label>
        <select
          className={inputClass}
          value={payoutWalletId}
          onChange={(e) => setPayoutWalletId(e.target.value)}
        >
          <option value="">Choose…</option>
          {wallets?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label || w.owner_type} ({w.currency})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create listing"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't create the listing.
          </p>
        )}
      </div>
    </div>
  );
}
