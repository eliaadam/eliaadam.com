import { useState } from "react";
import { Copy } from "lucide-react";

const codeBlockClass =
  "overflow-x-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100 dark:bg-black";

/**
 * In-app rendering of the external developer guide — same content as
 * the standalone published reference, but embedded so an integrator
 * (or whoever's setting one up) doesn't need a separate link. The
 * base URL in every example is the REAL one for this deployment
 * (window.location.origin), not a placeholder — copy-paste should
 * just work.
 *
 * Deliberately doesn't cover the internal, bearer-token-authenticated
 * management endpoints (credentials/webhook-endpoints/issuance) —
 * this page is written for an EXTERNAL integrator calling
 * /api/gateway/v1/, the same scope the standalone guide has. The
 * Credentials/Webhooks/Transactions tabs alongside this one are
 * already the UI for the internal side.
 */
export function PaymentGatewayDocs() {
  const baseUrl =
    typeof window !== "undefined"
      ? `https://sysc.sonicpesa.com/api/gateway/v1/`
      : "https://sysc.sonicpesa.com/api/gateway/v1/";

  return (
    <div className="flex flex-col gap-8 text-sm leading-relaxed">
      <section>
        <p className="text-neutral-600 dark:text-neutral-400">
          Collect payments on your own platform's behalf through Selcom or
          Flutterwave, without integrating either gateway directly. Create a
          payment intent through one API call, we handle collection, and we
          notify your server the moment it resolves.
        </p>
      </section>

      <DocSection title="1. Getting an API key">
        <p>
          Issued from the <strong>Credentials</strong> tab on this page —
          "Request a new key." Depending on how your account is configured, a
          request either issues a key immediately or requires approval first.
        </p>
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          The secret key is shown exactly once. There is no way to retrieve it
          again — store it in your server's own secrets manager, never in
          client-side code.
        </p>
        <p className="mt-2">
          Each credential is tied to one specific wallet at issuance — every
          payment collected with that key lands there, and only there.
        </p>
      </DocSection>

      <DocSection title="2. Authentication">
        <p>
          Every request uses HTTP Basic Auth — your public key as the username,
          your secret key as the password:
        </p>
        <CodeBlock>{`Authorization: Basic base64(public_key:secret_key)`}</CodeBlock>
        <CodeBlock>{`curl -u "pgw_pk_XXXX:pgw_sk_XXXX" \\\n  ${baseUrl}/payment-intents/`}</CodeBlock>
        <p className="mt-2">
          A missing, malformed, or invalid credential pair — including a{" "}
          <strong>revoked</strong> one — always returns the identical{" "}
          <code>401</code>. This is deliberate: the response never reveals which
          half of the pair was wrong.
        </p>
        <p className="mt-2">
          Only <code>selcom</code> and <code>flutterwave</code> are available as
          collection gateways. There is no "manual" option for external
          integrators.
        </p>
      </DocSection>

      <DocSection title="3. Creating a payment">
        <p>
          One call creates the intent <strong>and</strong> starts collection —
          no separate "initiate" step.
        </p>
        <CodeBlock>{`POST ${baseUrl}/payment-intents/

{
  "amount": 500000,
  "currency": "TZS",
  "gateway": "selcom",
  "description": "Order #4821",
  "buyer_name": "Asha Mwangi",
  "buyer_email": "asha@example.com",
  "buyer_phone": "0767104594",
  "idempotency_key": "order-4821-attempt-1"
}`}</CodeBlock>
        <p className="mt-2">
          <code>amount</code> is always an integer in minor units — 500000 =
          5,000.00 TZS, never a float. <code>buyer_phone</code> is required in
          practice for Selcom — it's where the USSD prompt is sent.
        </p>
        <CodeBlock>{`201 Created
{
  "intent_id": "e6502224-15e4-4fa5-94ae-2cae593cf7ea",
  "status": "processing",
  "checkout_url": null,
  "next_action": null
}`}</CodeBlock>
        <p className="mt-2">
          <code>status</code> almost always comes back as{" "}
          <code>"processing"</code> immediately — collection is asynchronous.
          The payment isn't done yet; find out it resolved via webhook or
          polling below.
        </p>
      </DocSection>

      <DocSection title="4. Finding out when a payment resolves">
        <p className="font-medium">Webhooks (recommended, primary)</p>
        <p className="mt-1">
          Register an endpoint from the <strong>Webhooks</strong> tab — you'll
          get a signing secret, shown once, same as your API secret key.
        </p>
        <CodeBlock>{`POST <your registered URL>
X-Gateway-Event: payment_intent.succeeded
X-Gateway-Signature: <hex HMAC-SHA256>

{
  "event_type": "payment_intent.succeeded",
  "intent_id": "e6502224-15e4-4fa5-94ae-2cae593cf7ea",
  "status": "succeeded",
  "amount": 500000,
  "currency": "TZS",
  "gateway": "selcom",
  "gateway_reference": "SEL-9284712",
  "failure_reason": null,
  "metadata": {}
}`}</CodeBlock>
        <p className="mt-2 font-medium">Always verify the signature:</p>
        <CodeBlock>{`import hmac, hashlib

def verify_signature(raw_body: bytes, signature_header: str, signing_secret: str) -> bool:
    expected = hmac.new(signing_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)`}</CodeBlock>
        <p className="mt-2">
          Your endpoint must use <code>https://</code>, accept JSON, and return
          a <code>2xx</code> to acknowledge. On failure, delivery retries up to{" "}
          <strong>5 times</strong>, backing off from 60s to 480s, before giving
          up — design your endpoint to be idempotent.
        </p>
        <p className="mt-4 font-medium">Polling (fallback)</p>
        <CodeBlock>{`GET  ${baseUrl}/payment-intents/{id}/            # last-known status
POST ${baseUrl}/payment-intents/{id}/reconcile/  # force a fresh check`}</CodeBlock>
      </DocSection>

      <DocSection title="5. Errors">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {[
              ["400", "Malformed request, or an unsupported gateway value."],
              ["401", "Missing, invalid, or revoked API credentials."],
              [
                "404",
                "Doesn't exist, or belongs to a different credential — deliberately indistinguishable.",
              ],
              ["500", "Something went wrong on our end. Safe to retry."],
            ].map(([code, meaning]) => (
              <tr
                key={code}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                <td className="py-2 pr-4 font-mono font-medium">{code}</td>
                <td className="py-2 text-neutral-600 dark:text-neutral-400">
                  {meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>

      <DocSection title="6. Idempotency">
        <p>
          Pass <code>idempotency_key</code> to safely retry a request whose
          outcome you're unsure of. Use something derived from your own order
          id, not a fresh random value on every retry.
        </p>
      </DocSection>

      <DocSection title="Quick reference">
        <CodeBlock>{`Base URL:      ${baseUrl}/
Authentication: HTTP Basic — username = public key, password = secret key
Amounts:        Always integers, minor units
Gateways:       selcom, flutterwave

POST   /payment-intents/                    Create + start collection
GET    /payment-intents/{id}/               Check last-known status
POST   /payment-intents/{id}/reconcile/     Force a fresh status check`}</CodeBlock>
      </DocSection>
    </div>
  );
}

function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative mt-2">
      <pre className={codeBlockClass}>
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        aria-label="Copy"
        className="absolute right-2 top-2 rounded p-1 text-neutral-400 hover:text-white"
      >
        <Copy size={13} />
      </button>
      {copied && (
        <span className="absolute right-8 top-2.5 text-[10px] text-neutral-400">
          Copied
        </span>
      )}
    </div>
  );
}
