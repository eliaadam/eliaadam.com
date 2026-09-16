import {
  DocPageTitle,
  DocSection,
  CodeBlock,
  Callout,
} from "../../components/payment-gateway/DocsPrimitives";

export function AccountCreationDoc() {
  const baseUrl =
    typeof window !== "undefined"
      ? "https://sysc.sonicpesa.com"
      : "https://sysc.sonicpesa.com";

  return (
    <>
      <DocPageTitle
        title="1. Account creation"
        description="Everything below this page assumes you already have a platform account. Start here if you don't."
      />

      <DocSection title="Register">
        <p>
          One call creates your account and logs you in — no separate
          verification step required before you can start working.
        </p>
        <CodeBlock>{`POST ${baseUrl}/api/identity/auth/register

{
  "email": "you@example.com",
  "password": "a-strong-password",
  "display_name": "Your Name"
}`}</CodeBlock>
        <CodeBlock>{`201 Created
{
  "actor": {
    "id": "b6a1...",
    "display_name": "Your Name",
    "status": "active"
  },
  "access_token": "..."
}`}</CodeBlock>
        <Callout>
          <strong>
            This <code>access_token</code> is for the internal platform
            dashboard API
          </strong>{" "}
          (creating containers, managing wallets, requesting API credentials,
          and so on) — a Bearer token, used as{" "}
          <code>Authorization: Bearer &lt;access_token&gt;</code>. It is a
          completely different mechanism from the public/secret key pair you'll
          obtain in section 3, which authenticates your own server's calls to
          the external collection API. Don't confuse the two — nothing below
          this page ever asks for this Bearer token again; everything from
          section 3 onward uses the key pair instead.
        </Callout>
      </DocSection>

      <DocSection title="Log in later">
        <p>Returning to an existing account:</p>
        <CodeBlock>{`POST ${baseUrl}/api/identity/auth/login

{
  "email": "you@example.com",
  "password": "a-strong-password"
}`}</CodeBlock>
      </DocSection>
    </>
  );
}
