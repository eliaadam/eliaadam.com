import {
  DocSection,
  CodeBlock,
  DocTable,
  DocPageTitle,
} from "../../components/docs/DocsPrimitives";

export function AuthenticationDoc() {
  const baseUrl = "https://sysc.sonicpesa.com/api/gateway/v1";

  return (
    <>
      <DocPageTitle
        title="4. Authentication"
        description="Every request from here on — sections 5 and 6 — uses the key pair from section 3, not the Bearer token from account creation."
      />

      <DocSection title="HTTP Basic Auth">
        <p>Your public key as the username, your secret key as the password:</p>
        <CodeBlock>{`Authorization: Basic base64(public_key:secret_key)`}</CodeBlock>
        <CodeBlock>{`curl -u "pgw_pk_XXXX:pgw_sk_XXXX" \\\n  ${baseUrl}/payment-intents/`}</CodeBlock>
        <p className="mt-3">
          Most HTTP libraries handle this encoding for you automatically when
          you pass basic-auth credentials directly, rather than needing to build
          the header yourself.
        </p>
      </DocSection>

      <DocSection title="Failure behavior">
        <p>
          A missing, malformed, or invalid credential pair — including a{" "}
          <strong>revoked</strong> one — always returns the identical response:
        </p>
        <DocTable
          rows={[
            {
              cells: [
                "401",
                '{"error": "Invalid or revoked API credentials."}',
              ],
            },
          ]}
        />
        <p className="mt-3">
          This is deliberate: the response never reveals which half of the pair
          was wrong, or whether the key was ever valid at all — that ambiguity
          is intentional, not a bug to work around.
        </p>
      </DocSection>

      <DocSection title="Gateways">
        <p>
          Only <code>selcom</code> and <code>flutterwave</code> are available as
          collection gateways through this API — there is no "manual" option for
          external integrators.
        </p>
      </DocSection>
    </>
  );
}
