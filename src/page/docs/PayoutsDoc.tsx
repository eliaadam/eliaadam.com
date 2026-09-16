import {
  DocPageTitle,
  Callout,
  DocSection,
  CodeBlock,
} from "../../components/payment-gateway/DocsPrimitives";

export function PayoutsDoc() {
  const baseUrl =
    typeof window !== "undefined"
      ? `https://sysc.sonicpesa.com`
      : "https://sysc.sonicpesa.com";

  return (
    <>
      <DocPageTitle
        title="7. Payout requests"
        description="Moving money collected in your wallet out to a bank account or mobile money number."
      />

      <Callout>
        <strong>A different authentication model from sections 4–6.</strong>{" "}
        Payouts aren't part of the external, key-authenticated collection API —
        they're an internal dashboard operation, authenticated with the Bearer
        token from section 1, not your public/secret key pair.
      </Callout>

      <DocSection title="The easy way">
        <p>
          The dashboard's own <strong>Payment → Payouts</strong> tab handles
          this with a form. That's the recommended path for most people; the raw
          API call below is for automating payout requests from your own systems
          instead.
        </p>
      </DocSection>

      <DocSection title="Requesting a payout directly">
        <CodeBlock>{`POST ${baseUrl}/api/payment/payouts/
Authorization: Bearer <access_token>

{
  "source_wallet_id": "<wallet_id>",
  "amount": 500000,
  "currency": "TZS",
  "destination_type": "mobile_money",
  "destination": {
    "mobile_money": {
      "country": "TZ",
      "network": "vodacom",
      "msisdn": "0767104594"
    }
  },
  "narration": "Weekly payout",
  "idempotency_key": "payout-week-37"
}`}</CodeBlock>
        <p className="mt-3">
          <code>destination_type</code> is either <code>"bank"</code> or{" "}
          <code>"mobile_money"</code> — for a bank destination,{" "}
          <code>destination</code> takes a <code>bank</code> object with{" "}
          <code>code</code> and <code>number</code> instead.
        </p>
      </DocSection>

      <DocSection title="Submitting it">
        <p>
          Creating a payout records the request; a separate call actually sets
          money moving:
        </p>
        <CodeBlock>{`POST ${baseUrl}/api/payment/payouts/{id}/submit/
Authorization: Bearer <access_token>`}</CodeBlock>
        <p className="mt-3">
          A payout can settle across more than one rail if needed, and a partial
          success is a real, first-class outcome — not every case resolves in
          one clean step. If a payout comes back{" "}
          <code>partially_succeeded</code>, calling <code>submit/</code> again
          covers whatever's still outstanding.
        </p>
      </DocSection>

      <Callout tone="warning">
        The exact base path for these endpoints (<code>/api/payment/...</code>)
        reflects this platform's own routing convention but hasn't been
        independently re-verified against the live server the way sections 4–6
        have. If a call here 404s, check with your account contact before
        assuming your own request is malformed.
      </Callout>
    </>
  );
}
