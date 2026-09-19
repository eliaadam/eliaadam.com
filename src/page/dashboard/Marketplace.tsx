import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import {
  sdk,
  type Listing,
  type ListingCategory,
  type VisibilityScope,
} from "../../lib/sdk";
import { API_BASE_URL } from "../../lib/query/Api";
import { getListingCardBody } from "../../lib/registries/listingCardRegistry";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageMarketplaceListings } from "../../lib/hooks/useCanManageMarketplaceListings";
import { DirectPayFlow } from "../../components/payment-gateway/DirectPayFlow";

import { cn } from "../../design-system/lib/utils";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const segmentedButtonClass =
  "rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors";

const activeSegmentClass = "border-primary bg-primary text-primary-foreground";

const inactiveSegmentClass =
  "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground";

function formatPrice(price: number, currency: string) {
  return `${currency} ${(price / 100).toFixed(2)}`;
}

export function Marketplace() {
  const { currentContainerId } = useContainer();
  const { data: canManage } = useCanManageMarketplaceListings();

  const [activeTab, setActiveTab] = useState<"manage" | "browse">("browse");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<ListingCategory | null>(null);

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

  const { data: categories } = useQuery({
    queryKey: ["surfacing", "categories"],
    queryFn: () => sdk.surfacing.listCategories(),
  });

  const { data: browseResults, isLoading: browseLoading } = useQuery({
    queryKey: ["surfacing", "marketplace", search, selectedCategory],
    queryFn: () =>
      sdk.surfacing.browseMarketplace(
        search || undefined,
        selectedCategory ?? undefined,
      ),
  });

  const {
    data: containerStorefrontResults,
    isLoading: containerStorefrontLoading,
  } = useQuery({
    queryKey: [
      "surfacing",
      "container-marketplace",
      currentContainerId,
      search,
    ],
    queryFn: () =>
      sdk.surfacing.browseContainerMarketplace(
        currentContainerId!,
        search || undefined,
      ),
    enabled: Boolean(currentContainerId),
  });

  const activeResults = useMemo(() => {
    if (!browseResults && !containerStorefrontResults) return undefined;

    const seen = new Set<string>();
    const merged: Listing[] = [];

    for (const listing of browseResults ?? []) {
      if (!seen.has(listing.id)) {
        seen.add(listing.id);
        merged.push(listing);
      }
    }

    for (const listing of containerStorefrontResults ?? []) {
      if (!seen.has(listing.id)) {
        seen.add(listing.id);
        merged.push(listing);
      }
    }

    if (!selectedCategory) return merged;

    return merged.filter(
      (listing) =>
        listing.source_capability === selectedCategory.source_capability &&
        listing.source_type === selectedCategory.source_type,
    );
  }, [browseResults, containerStorefrontResults, selectedCategory]);

  const activeLoading =
    browseLoading ||
    (Boolean(currentContainerId) && containerStorefrontLoading);

  const showManageTab = Boolean(canManage && currentContainerId);

  return (
    <div className="ds-content">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Marketplace
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Buy and sell anything a capability lets an actor own — templates,
              access, anything with an id.
            </p>
          </div>

          {showManageTab && (
            <Button
              type="button"
              onClick={() => {
                setActiveTab("manage");
                setShowCreate(true);
              }}
            >
              <Plus />
              New listing
            </Button>
          )}
        </header>

        {showManageTab && (
          <div className="border-b border-border">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("browse")}
                className={cn(
                  "relative pb-3 text-sm font-medium transition-colors",
                  activeTab === "browse"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Browse
                {activeTab === "browse" && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("manage")}
                className={cn(
                  "relative pb-3 text-sm font-medium transition-colors",
                  activeTab === "manage"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Manage listings
                {activeTab === "manage" && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            </div>
          </div>
        )}

        {showManageTab && activeTab === "manage" && (
          <ManageListings
            currentContainerId={currentContainerId!}
            myListings={myListings}
            draftListings={draftListings}
            showCreate={showCreate}
            onShowCreate={setShowCreate}
          />
        )}

        {(!showManageTab || activeTab === "browse") && (
          <BrowseMarketplace
            search={search}
            setSearch={setSearch}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            activeLoading={activeLoading}
            activeResults={activeResults}
          />
        )}
      </div>
    </div>
  );
}

function ManageListings({
  currentContainerId,
  myListings,
  draftListings,
  showCreate,
  onShowCreate,
}: {
  currentContainerId: string;
  myListings?: Listing[];
  draftListings?: Listing[];
  showCreate: boolean;
  onShowCreate: (value: boolean) => void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Your listings
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage what this container makes available.
          </p>
        </div>

        <Button
          type="button"
          variant={showCreate ? "outline" : "primary"}
          onClick={() => onShowCreate(!showCreate)}
        >
          <Plus />
          {showCreate ? "Close" : "New listing"}
        </Button>
      </div>

      {showCreate && (
        <CreateListingForm
          containerId={currentContainerId}
          onDone={() => onShowCreate(false)}
        />
      )}

      {(draftListings?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Drafts</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Not visible in the marketplace yet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {draftListings!.map((listing) => (
              <ManagedListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}

      {(myListings?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Active</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myListings!.map((listing) => (
              <ManagedListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}

      {!draftListings?.length && !myListings?.length && !showCreate && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <ShoppingBag size={22} />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              No listings yet
            </p>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first marketplace listing for this container.
            </p>

            <Button className="mt-5" onClick={() => onShowCreate(true)}>
              <Plus />
              Create listing
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function BrowseMarketplace({
  search,
  setSearch,
  categories,
  selectedCategory,
  setSelectedCategory,
  activeLoading,
  activeResults,
}: {
  search: string;
  setSearch: (value: string) => void;
  categories?: ListingCategory[];
  selectedCategory: ListingCategory | null;
  setSelectedCategory: (value: ListingCategory | null) => void;
  activeLoading: boolean;
  activeResults?: Listing[];
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Browse marketplace
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Discover products, access, events, and other available resources.
          </p>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings..."
            className="pl-9"
          />
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>

          {categories.map((category) => {
            const isActive =
              selectedCategory?.source_capability ===
                category.source_capability &&
              selectedCategory?.source_type === category.source_type;

            return (
              <button
                key={`${category.source_capability}:${category.source_type}`}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {category.source_type.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      )}

      <Separator />

      {activeLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))}
        </div>
      )}

      {!activeLoading && activeResults?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <ShoppingBag size={22} />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              Nothing here yet
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Try another search or category.
            </p>
          </CardContent>
        </Card>
      )}

      {!activeLoading && activeResults && activeResults.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeResults.map((listing) => (
            <BrowseListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{listing.title}</CardTitle>

            <CardDescription className="mt-1">
              {listing.source_capability}/{listing.source_type}
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate()}
            aria-label="Archive listing"
            className="shrink-0 text-muted-foreground hover:text-error"
          >
            <Archive size={15} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={listing.status === "draft" ? "warning" : "success"}>
            {listing.status}
          </Badge>

          <span className="text-sm font-semibold text-foreground">
            {formatPrice(listing.price, listing.currency)}
          </span>
        </div>

        {listing.status === "draft" && (
          <Button
            type="button"
            size="sm"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? "Publishing..." : "Publish"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ListingImageCarousel({ fileIds }: { fileIds: string[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const validIndices = fileIds
    .map((_, itemIndex) => itemIndex)
    .filter((itemIndex) => !failed.has(itemIndex));

  if (validIndices.length === 0) return null;

  const currentIndex = validIndices.includes(index) ? index : validIndices[0];

  const step = (direction: 1 | -1) => {
    const position = validIndices.indexOf(currentIndex);
    const nextPosition =
      (position + direction + validIndices.length) % validIndices.length;

    setIndex(validIndices[nextPosition]);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl">
      <img
        src={`${API_BASE_URL}/api/document/files/${fileIds[currentIndex]}/raw/`}
        alt=""
        onError={() =>
          setFailed((previous) => new Set(previous).add(currentIndex))
        }
        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />

      {validIndices.length > 1 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronLeft size={15} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronRight size={15} />
          </Button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {validIndices.map((itemIndex) => (
              <button
                key={itemIndex}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIndex(itemIndex);
                }}
                aria-label={`Go to image ${itemIndex + 1}`}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  itemIndex === currentIndex ? "bg-white" : "bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DefaultListingCardBody({ listing }: { listing: Listing }) {
  return (
    <div className="space-y-3">
      {listing.images.length > 0 && (
        <ListingImageCarousel fileIds={listing.images} />
      )}

      <div>
        <p className="text-sm font-semibold text-foreground">{listing.title}</p>

        <p className="mt-1 text-sm font-medium text-foreground">
          {listing.pricing_mode === "free"
            ? "Free"
            : listing.pricing_mode === "subscription"
              ? `${formatPrice(listing.price, listing.currency)} · Subscription`
              : formatPrice(listing.price, listing.currency)}
        </p>

        {listing.description && (
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {listing.description}
          </p>
        )}
      </div>
    </div>
  );
}

function BrowseListingCard({ listing }: { listing: Listing }) {
  const [showBuy, setShowBuy] = useState(false);

  const CustomBody = getListingCardBody(listing.source_capability);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {CustomBody ? (
          <CustomBody listing={listing} />
        ) : (
          <DefaultListingCardBody listing={listing} />
        )}

        <div className="mt-auto pt-2">
          {showBuy ? (
            <BuyForm listing={listing} onDone={() => setShowBuy(false)} />
          ) : (
            <Button type="button" size="sm" onClick={() => setShowBuy(true)}>
              {listing.pricing_mode === "free" ? "Get it free" : "Buy"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
  const [payMode, setPayMode] = useState<"wallet" | "direct">("wallet");

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
        <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
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
        <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <span>Subscribed. You'll be billed on the plan's own schedule.</span>
        </div>
      );
    }

    if (result.status === "fulfillment_failed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-foreground">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Payment succeeded, but something went wrong granting access. Contact
            the seller.
          </span>
        </div>
      );
    }

    if (result.status === "subscription_failed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-xs text-error">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Couldn't set up the subscription. Check the wallet balance and try
            again.
          </span>
        </div>
      );
    }
  }

  if (!currentContainerId) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Select a container first to choose a wallet to pay from.
      </p>
    );
  }

  const canPayDirect = listing.pricing_mode !== "free";

  return (
    <div className="flex flex-col gap-3">
      {canPayDirect && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setPayMode("wallet")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              payMode === "wallet"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Wallet
          </button>

          <button
            type="button"
            onClick={() => setPayMode("direct")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              payMode === "direct"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pay direct
          </button>
        </div>
      )}

      {payMode === "direct" && canPayDirect ? (
        <DirectPayFlow
          onSubmit={(buyerPhone) =>
            sdk.paymentGateway.requestDirectPurchase(listing.id, {
              method_type: "mobile_money",
              buyer_phone: buyerPhone,
            })
          }
          successLabel={
            listing.pricing_mode === "subscription"
              ? "Subscribed. You'll be billed on the plan's own schedule."
              : "Purchased. Check your account for access."
          }
          invalidateKeys={[["surfacing"]]}
        />
      ) : (
        <>
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  listing.pricing_mode === "free"
                    ? "Account to use..."
                    : "Pay from..."
                }
              />
            </SelectTrigger>

            <SelectContent>
              {wallets?.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.label || wallet.owner_type} ({wallet.currency}{" "}
                  {(wallet.balance / 100).toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={!walletId || mutation.isPending}
            >
              {mutation.isPending
                ? listing.pricing_mode === "subscription"
                  ? "Subscribing..."
                  : "Buying..."
                : listing.pricing_mode === "free"
                  ? "Get it free"
                  : listing.pricing_mode === "subscription"
                    ? "Subscribe"
                    : "Confirm"}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          </div>

          {mutation.isError && (
            <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
              Couldn't complete the purchase. Check the wallet balance and try
              again.
            </p>
          )}
        </>
      )}
    </div>
  );
}

const VISIBILITY_SCOPE_OPTIONS: {
  value: VisibilityScope;
  label: string;
  hint: string;
}[] = [
  {
    value: "system",
    label: "System marketplace",
    hint: "Visible to anyone browsing the global marketplace.",
  },
  {
    value: "members",
    label: "Container members",
    hint: "Visible only to actors who are a member of this container.",
  },
  {
    value: "container_only",
    label: "This container only",
    hint: "Only visible from this container's own listings.",
  },
];

function CreateListingForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const [sourceMode, setSourceMode] = useState<
    "inventory" | "events" | "manual"
  >("inventory");

  const [inventoryItemId, setInventoryItemId] = useState("");
  const [eventId, setEventId] = useState("");

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
  const [visibilityScope, setVisibilityScope] =
    useState<VisibilityScope>("system");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", containerId],
    queryFn: () => sdk.payment.listWallets(containerId),
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory", "items", containerId],
    queryFn: () => sdk.inventory.listItems(containerId, "active"),
    enabled: sourceMode === "inventory",
  });

  const { data: containerEvents } = useQuery({
    queryKey: ["events", "list", containerId],
    queryFn: () => sdk.events.listEvents(containerId, "active"),
    enabled: sourceMode === "events",
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
        visibility_scope: visibilityScope,

        ...(sourceMode === "inventory"
          ? { inventory_item_id: inventoryItemId }
          : sourceMode === "events"
            ? {
                catalog_capability: "core.events",
                catalog_item_id: eventId,
              }
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
      : sourceMode === "events"
        ? Boolean(eventId)
        : Boolean(title) &&
          Boolean(sourceCapability) &&
          Boolean(sourceType) &&
          Boolean(sourceId) &&
          (pricingMode === "free" || Boolean(price)));

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle>Create listing</CardTitle>
        <CardDescription>
          Choose what you are selling, how it is priced, and who can see it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <FormSection title="What are you selling?">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSourceMode("inventory")}
              className={cn(
                segmentedButtonClass,
                sourceMode === "inventory"
                  ? activeSegmentClass
                  : inactiveSegmentClass,
              )}
            >
              From inventory
            </button>

            <button
              type="button"
              onClick={() => setSourceMode("events")}
              className={cn(
                segmentedButtonClass,
                sourceMode === "events"
                  ? activeSegmentClass
                  : inactiveSegmentClass,
              )}
            >
              From events
            </button>

            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={cn(
                segmentedButtonClass,
                sourceMode === "manual"
                  ? activeSegmentClass
                  : inactiveSegmentClass,
              )}
            >
              Something else
            </button>
          </div>
        </FormSection>

        {sourceMode === "inventory" && (
          <FormSection
            title="Inventory item"
            description="Listing details and images are copied from the selected item."
          >
            <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an inventory item..." />
              </SelectTrigger>

              <SelectContent>
                {inventoryItems?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title} ({item.price.currency}{" "}
                    {(item.price.total / 100).toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {inventoryItems?.length === 0 && (
              <FormHint>
                No published inventory items yet. Publish one first, or choose
                “Something else”.
              </FormHint>
            )}
          </FormSection>
        )}

        {sourceMode === "events" && (
          <FormSection
            title="Event"
            description="Buying this listing also registers the buyer as an attendee."
          >
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>

              <SelectContent>
                {containerEvents?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} (
                    {new Date(event.starts_at).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {containerEvents?.length === 0 && (
              <FormHint>
                No published events yet. Publish one under Events first.
              </FormHint>
            )}
          </FormSection>
        )}

        {sourceMode === "manual" && (
          <div className="space-y-5">
            <FormField label="Title">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Listing title"
              />
            </FormField>

            <FormField label="Description">
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what is being sold"
              />
            </FormField>

            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium text-foreground">
                Source reference
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Reference another capability's data, such as a provisioning
                template.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  placeholder="source_capability"
                  value={sourceCapability}
                  onChange={(event) => setSourceCapability(event.target.value)}
                />

                <Input
                  placeholder="source_type"
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                />

                <Input
                  placeholder="source_id"
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        <FormSection title="Pricing">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["free", "one_time", "subscription"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPricingMode(mode)}
                className={cn(
                  segmentedButtonClass,
                  pricingMode === mode
                    ? activeSegmentClass
                    : inactiveSegmentClass,
                )}
              >
                {mode === "free"
                  ? "Free"
                  : mode === "one_time"
                    ? "One-time"
                    : "Subscription"}
              </button>
            ))}
          </div>
        </FormSection>

        {pricingMode === "subscription" && (
          <FormField
            label="Subscription plan"
            hint={
              plans?.length === 0
                ? "No subscription plans exist for this container yet."
                : undefined
            }
          >
            <Select
              value={subscriptionPlanId}
              onValueChange={setSubscriptionPlanId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a subscription plan..." />
              </SelectTrigger>

              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} ({plan.currency} {(plan.price / 100).toFixed(2)}
                    /{plan.billing_interval})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {sourceMode === "manual" && pricingMode !== "free" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Price">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="9.99"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </FormField>

            <FormField label="Currency">
              <Input
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                placeholder="USD"
              />
            </FormField>
          </div>
        )}

        <FormField label="Payout wallet">
          <Select value={payoutWalletId} onValueChange={setPayoutWalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose payout wallet..." />
            </SelectTrigger>

            <SelectContent>
              {wallets?.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.label || wallet.owner_type} ({wallet.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormSection title="Visibility">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {VISIBILITY_SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibilityScope(option.value)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  visibilityScope === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-surface hover:bg-muted",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium",
                    visibilityScope === option.value
                      ? "text-primary"
                      : "text-foreground",
                  )}
                >
                  {option.label}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {option.hint}
                </p>
              </button>
            ))}
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create listing"}
          </Button>

          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>

          {mutation.isError && (
            <p className="text-sm text-error sm:ml-auto">
              Couldn't create the listing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {children}

      {hint && (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function FormHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
      {children}
    </p>
  );
}
