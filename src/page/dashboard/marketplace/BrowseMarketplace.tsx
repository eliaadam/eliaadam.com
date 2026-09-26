import { useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { type Listing, type ListingCategory } from "../../../lib/sdk";
import { getListingCardBody } from "../../../lib/registries/listingCardRegistry";

import { cn } from "../../../design-system/lib/utils";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";
import { ListingImageCarousel } from "./ListingImageCarousel";
import { BuyForm } from "./BuyForm";
import { formatPrice } from "./shared";
import { useCart } from "../../../context/CartContext";
import { MessageContainerButton } from "../../../components/messaging/MessageContainerOwnerButton";

/** Split out of what used to be one large Marketplace.tsx. */

export function BrowseMarketplace({
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
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();

  const CustomBody = getListingCardBody(listing.source_capability);

  const handleAddToCart = () => {
    addItem(listing);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {CustomBody ? (
          <CustomBody listing={listing} />
        ) : (
          <DefaultListingCardBody listing={listing} />
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          {showBuy ? (
            <BuyForm listing={listing} onDone={() => setShowBuy(false)} />
          ) : (
            <>
              <Button type="button" size="sm" onClick={() => setShowBuy(true)}>
                {listing.pricing_mode === "free" ? "Get it free" : "Buy"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddToCart}
              >
                {justAdded ? "Added" : "Add to cart"}
              </Button>
              <MessageContainerButton
                containerId={listing.container_id}
                label="Message seller"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
