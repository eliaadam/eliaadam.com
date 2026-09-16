import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Copy, Eye, EyeOff } from "lucide-react";
import { sdk } from "../../lib/sdk";

import { useContainer } from "../../components/context/ContainerContext";
import type {
  NewApiCredential,
  RequestApiKeyResult,
  ApiCredential,
  NewWebhookEndpoint,
  WebhookEndpoint,
  ApiKeyRequest,
} from "../../lib/sdk/domains/paymentGateway";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

type TabId = "credentials" | "webhooks" | "my-requests" | "approvals";

const TABS: { id: TabId; label: string }[] = [
  { id: "credentials", label: "Credentials" },
  { id: "webhooks", label: "Webhooks" },
  { id: "my-requests", label: "My Requests" },
  { id: "approvals", label: "Approvals" },
];

/**
 * Management UI for capabilities.core.payment_gateway — issuing/
 * revoking API credentials, registering webhook endpoints, and (for
 * platform admins) approving pending key requests. Deliberately its
 * own page/nav entry, not folded into Payment.tsx's own Pay/Wallets/
 * History/Payouts tabs — this is a developer-integration surface, a
 * different audience from the consumer-facing payment flows there.
 *
 * The "Approvals" tab is shown unconditionally rather than hidden
 * behind a client-side permission check — this app has no confirmed
 * frontend authorize()-style hook to gate on, so a user without
 * core.payment_gateway.issuance.approve simply sees a clean 403
 * message if they open it, rather than the tab silently vanishing in
 * a way that could look like a bug.
 */
export function PaymentGateway() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "credentials";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Payment Gateway</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Let external systems collect payments on this container's behalf, with
        webhook notification when a payment resolves.
      </p>

      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSearchParams({ tab: tab.id })}
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
        {activeTab === "credentials" && <CredentialsTab />}
        {activeTab === "webhooks" && <WebhooksTab />}
        {activeTab === "my-requests" && <MyRequestsTab />}
        {activeTab === "approvals" && <ApprovalsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: one-time secret reveal
// ---------------------------------------------------------------------------

function SecretReveal({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning: string;
}) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
        {warning}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs dark:bg-neutral-900">
          {visible ? value : "•".repeat(Math.min(value.length, 40))}
        </code>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide" : "Show"}
          className="flex-none text-neutral-500 hover:text-black dark:hover:text-white"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={`Copy ${label}`}
          className="flex-none text-neutral-500 hover:text-black dark:hover:text-white"
        >
          <Copy size={14} />
        </button>
      </div>
      {copied && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-500">
          Copied.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function CredentialsTab() {
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [justIssued, setJustIssued] = useState<NewApiCredential | null>(null);
  const [pendingResult, setPendingResult] =
    useState<RequestApiKeyResult | null>(null);

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["payment-gateway", "credentials", currentContainerId],
    queryFn: () => sdk.paymentGateway.listCredentials(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => sdk.paymentGateway.revokeCredential(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["payment-gateway", "credentials", currentContainerId],
      }),
  });

  const [walletId, setWalletId] = useState("");
  const [label, setLabel] = useState("");

  const requestMutation = useMutation({
    mutationFn: () =>
      sdk.paymentGateway.requestApiKey(currentContainerId!, {
        wallet_id: walletId,
        label,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["payment-gateway", "credentials", currentContainerId],
      });
      if (result.type === "credential") {
        setJustIssued(result);
      } else {
        setPendingResult(result);
      }
      setShowRequestForm(false);
      setWalletId("");
      setLabel("");
    },
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {justIssued && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm font-medium">
            New credential — {justIssued.label}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Public key
          </p>
          <code className="rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-900">
            {justIssued.public_key}
          </code>
          <SecretReveal
            label="secret key"
            value={justIssued.secret_key}
            warning="Save this secret key now — it will never be shown again."
          />
          <button
            type="button"
            onClick={() => setJustIssued(null)}
            className="self-start text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Done
          </button>
        </div>
      )}

      {pendingResult && pendingResult.type === "instantiation_request" && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm font-medium">Request submitted</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            This container's kind requires approval before a key is issued.
            Check "My Requests" for status.
          </p>
          <button
            type="button"
            onClick={() => setPendingResult(null)}
            className="mt-2 text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {credentials && credentials.length === 0 && !showRequestForm && (
        <p className="py-4 text-sm text-neutral-500 dark:text-neutral-500">
          No API credentials yet.
        </p>
      )}

      {credentials && credentials.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {credentials.map((c: ApiCredential) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.label}</p>
                <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-500">
                  {c.public_key}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "active"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500"
                  }`}
                >
                  {c.status}
                </span>
                {c.status === "active" && (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(c.id)}
                    disabled={revokeMutation.isPending}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!showRequestForm ? (
        <button
          type="button"
          onClick={() => setShowRequestForm(true)}
          className={`self-start ${primaryButtonClass}`}
        >
          Request a new key
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestMutation.mutate();
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Wallet — collected money lands here
            </label>
            <select
              className={inputClass}
              required
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              <option value="">Choose a wallet…</option>
              {wallets?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label ?? "Wallet"} ({w.currency})
                </option>
              ))}
            </select>
          </div>
          <input
            className={inputClass}
            placeholder="Label (e.g. Production, Test)"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {requestMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {requestMutation.error instanceof Error
                ? requestMutation.error.message
                : "Couldn't submit the request."}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!walletId || !label || requestMutation.isPending}
              className={primaryButtonClass}
            >
              {requestMutation.isPending ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

function WebhooksTab() {
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [justRegistered, setJustRegistered] =
    useState<NewWebhookEndpoint | null>(null);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ["payment-gateway", "webhook-endpoints", currentContainerId],
    queryFn: () => sdk.paymentGateway.listWebhookEndpoints(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment-gateway", "webhook-endpoints", currentContainerId],
    });

  const registerMutation = useMutation({
    mutationFn: () =>
      sdk.paymentGateway.registerWebhookEndpoint(currentContainerId!, url),
    onSuccess: (endpoint) => {
      invalidate();
      setJustRegistered(endpoint);
      setShowForm(false);
      setUrl("");
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => sdk.paymentGateway.disableWebhookEndpoint(id),
    onSuccess: invalidate,
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => sdk.paymentGateway.enableWebhookEndpoint(id),
    onSuccess: invalidate,
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {justRegistered && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm font-medium">
            New webhook endpoint — {justRegistered.url}
          </p>
          <SecretReveal
            label="signing secret"
            value={justRegistered.signing_secret}
            warning="Save this signing secret now — use it to verify incoming webhook payloads. It will never be shown again."
          />
          <button
            type="button"
            onClick={() => setJustRegistered(null)}
            className="self-start text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Done
          </button>
        </div>
      )}

      {isLoading && (
        <div className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      )}

      {endpoints && endpoints.length === 0 && !showForm && (
        <p className="py-4 text-sm text-neutral-500 dark:text-neutral-500">
          No webhook endpoints yet.
        </p>
      )}

      {endpoints && endpoints.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {endpoints.map((e: WebhookEndpoint) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5"
            >
              <p className="min-w-0 truncate text-sm font-medium">{e.url}</p>
              <div className="flex flex-none items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.status === "active"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500"
                  }`}
                >
                  {e.status}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    e.status === "active"
                      ? disableMutation.mutate(e.id)
                      : enableMutation.mutate(e.id)
                  }
                  disabled={
                    disableMutation.isPending || enableMutation.isPending
                  }
                  className="text-xs font-medium text-neutral-600 hover:underline disabled:opacity-60 dark:text-neutral-400"
                >
                  {e.status === "active" ? "Disable" : "Enable"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`self-start ${primaryButtonClass}`}
        >
          Register a webhook endpoint
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            registerMutation.mutate();
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <input
            className={inputClass}
            type="url"
            placeholder="https://your-server.example.com/webhooks/payment-gateway"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Must be https:// — payment data is never sent over plain HTTP.
          </p>
          {registerMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Couldn't register that endpoint.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!url || registerMutation.isPending}
              className={primaryButtonClass}
            >
              {registerMutation.isPending ? "Registering…" : "Register"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// My Requests
// ---------------------------------------------------------------------------

function MyRequestsTab() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["payment-gateway", "my-api-key-requests"],
    queryFn: () => sdk.paymentGateway.listMyApiKeyRequests(),
  });

  if (isLoading) {
    return (
      <div className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
        No API key requests yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {requests.map((r: ApiKeyRequest) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <p className="text-sm font-medium">
            {r.payload?.label ?? "API key request"}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              r.status === "pending"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                : r.status === "approved"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            }`}
          >
            {r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Approvals — platform admin (core.payment_gateway.issuance.approve)
// ---------------------------------------------------------------------------

function ApprovalsTab() {
  const queryClient = useQueryClient();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const {
    data: requests,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-gateway", "api-key-requests"],
    queryFn: () => sdk.paymentGateway.listApiKeyRequests("pending"),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment-gateway", "api-key-requests"],
    });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.paymentGateway.approveApiKeyRequest(id, reasonById[id]),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.paymentGateway.rejectApiKeyRequest(id, reasonById[id]),
    onSuccess: invalidate,
  });

  if (isError) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        You don't have permission to view pending API key requests.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
        No pending requests.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r: ApiKeyRequest) => (
        <li
          key={r.id}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">
            {r.payload?.label ?? "API key request"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Requested by {r.requester_actor_id}
          </p>
          {r.payload?.form_answers && (
            <pre className="overflow-x-auto rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
              {JSON.stringify(r.payload.form_answers, null, 2)}
            </pre>
          )}
          <input
            className={inputClass}
            placeholder="Reason (optional)"
            value={reasonById[r.id] ?? ""}
            onChange={(e) =>
              setReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
            }
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate(r.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={primaryButtonClass}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => rejectMutation.mutate(r.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
