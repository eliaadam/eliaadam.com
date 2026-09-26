import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus, ShoppingBag } from "lucide-react";
import { sdk, type Listing } from "../../../lib/sdk";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { CreateListingForm } from "./CreateListingForm";
import { formatPrice } from "./shared";

/** Split out of what used to be one large Marketplace.tsx. */

export function ManageListings({
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
