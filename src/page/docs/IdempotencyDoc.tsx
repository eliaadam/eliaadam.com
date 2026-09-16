import {
  DocPageTitle,
  DocSection,
  CodeBlock,
  Callout,
} from "../../components/payment-gateway/DocsPrimitives";

export function IdempotencyDoc() {
  return (
    <>
      <DocPageTitle
        title="6. Idempotency"
        description="Safely retry a request whose outcome you're unsure of, without risking a duplicate charge."
      />

      <DocSection title="How it works">
        <p>
          Pass <code>idempotency_key</code> on{" "}
          <code>POST /payment-intents/</code>. Using the same key twice will not
          create a second, duplicate payment intent for the same logical attempt
          — the second call returns the original intent instead of creating a
          new one.
        </p>
        <CodeBlock>{`{
  "amount": 500000,
  "currency": "TZS",
  "gateway": "selcom",
  "idempotency_key": "order-4821-attempt-1"
}`}</CodeBlock>
      </DocSection>

      <DocSection title="Choosing a key">
        <Callout tone="warning">
          Use something derived from your own order or transaction id — e.g.{" "}
          <code>order-4821-attempt-1</code> — not a fresh random value generated
          on every retry. A new random key on every attempt defeats the entire
          purpose: it's supposed to identify "the same logical attempt," which
          means it has to stay the same across retries of that attempt.
        </Callout>
      </DocSection>

      <DocSection title="When to use it">
        <p>
          Any time your own request might have gone through even though you
          didn't get a clean response back — a network timeout, a dropped
          connection, a retry after your server crashed mid-request. Without an
          idempotency key, retrying in that situation risks charging the buyer
          twice for the same order.
        </p>
      </DocSection>
    </>
  );
}
