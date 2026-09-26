import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk, type VisibilityScope } from "../../../lib/sdk";
import { cn } from "../../../design-system/lib/utils";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  segmentedButtonClass,
  activeSegmentClass,
  inactiveSegmentClass,
} from "./shared";

/** Split out of what used to be one large Marketplace.tsx. */

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

export function CreateListingForm({
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
