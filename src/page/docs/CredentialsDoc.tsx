import {
  DocPageTitle,
  DocSection,
  CodeBlock,
  Callout,
} from "../../components/payment-gateway/DocsPrimitives";

export function CredentialsDoc() {
  const baseUrl =
    typeof window !== "undefined"
      ? `https://sysc.sonicpesa.com`
      : "https://sysc.sonicpesa.com";

  return (
    <>
      <DocPageTitle
        title="3. Credential creation"
        description="With a container in hand, request the API key pair your server will use for every call from section 4 onward."
      />

      <DocSection title="The easy way">
        <p>
          The dashboard's own <strong>Payment Gateway → Credentials</strong> tab
          does this for you with a form — pick a wallet, give the key a label,
          submit. That's the recommended path for most people; the raw API call
          below is for automating the request instead.
        </p>
      </DocSection>

      <DocSection title="Requesting a key directly">
        <CodeBlock>{`POST ${baseUrl}/api/payment-gateway/containers/<container_id>/request-api-key/
Authorization: Bearer <access_token>

{
  "wallet_id": "<wallet_id>",
  "label": "Production"
}`}</CodeBlock>
        <p className="mt-3">
          <code>wallet_id</code> matters — every payment collected with this key
          lands in exactly that wallet, and only that wallet. If you need to
          collect into more than one wallet, request a separate key for each.
        </p>
      </DocSection>

      <DocSection title="What you get back">
        <p>
          Depending on your account's own configuration, a request either issues
          a key immediately or requires approval first — same two possible
          outcomes as instantiating the container in section 2:
        </p>
        <CodeBlock>{`// Issued immediately
201 Created
{
  "type": "credential",
  "id": "...",
  "public_key": "pgw_pk_...",
  "secret_key": "pgw_sk_...",
  "wallet_id": "...",
  "label": "Production"
}

// Requires approval
202 Accepted
{ "type": "instantiation_request", "request_id": "...", "status": "pending" }`}</CodeBlock>
        <Callout tone="warning">
          <strong>The secret key is shown exactly once</strong>, in that
          response body — there is no way to retrieve it again afterward. Copy
          it into your server's own secrets manager immediately. If you lose it,
          revoke the credential from the dashboard and request a new one.
        </Callout>
      </DocSection>
    </>
  );
}
