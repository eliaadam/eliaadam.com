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
