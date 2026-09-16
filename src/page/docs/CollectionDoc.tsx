import {
  DocSection,
  CodeBlock,
  Callout,
  DocPageTitle,
} from "../../components/docs/DocsPrimitives";

export function CollectionDoc() {
  const baseUrl = "https://sysc.sonicpesa.com/api/gateway/v1";

  return (
    <>
      <DocPageTitle
        title="5. Collection"
        description="Create a payment intent and start collecting — one call, no separate initiate step."
      />

      <DocSection title="Create a payment">
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
        <p className="mt-3">
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
        <p className="mt-3">
          <code>status</code> almost always comes back <code>"processing"</code>{" "}
          immediately — collection is asynchronous. The payment isn't done yet;
          find out it resolved by checking status below.
        </p>
      </DocSection>

      <DocSection title="Checking whether it resolved">
        <CodeBlock>{`GET  ${baseUrl}/payment-intents/{id}/            # last-known status
POST ${baseUrl}/payment-intents/{id}/reconcile/  # force a fresh check`}</CodeBlock>
        <p className="mt-3">
          <code>status</code> is one of <code>pending</code>,{" "}
          <code>processing</code>, <code>succeeded</code>, <code>failed</code>,{" "}
          <code>refunded</code>.
        </p>
        <Callout>
          Webhooks are the better way to find out a payment resolved, rather
          than polling — register an endpoint from the dashboard's{" "}
          <strong>Payment Gateway → Webhooks</strong> tab and we'll notify you
          the moment status changes. Reconcile above is the fallback for when
          you'd rather not run a public webhook endpoint at all.
        </Callout>
      </DocSection>

      <DocSection title="Errors">
        <CodeBlock>{`400  Malformed request, or an unsupported gateway value.
401  Missing, invalid, or revoked API credentials.
404  Doesn't exist, or belongs to a different credential — deliberately indistinguishable.
500  Something went wrong on our end. Safe to retry.`}</CodeBlock>
      </DocSection>
    </>
  );
}
