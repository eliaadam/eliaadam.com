import {
  DocPageTitle,
  DocSection,
  CodeBlock,
  Callout,
} from "../../components/payment-gateway/DocsPrimitives";

export function ContainerInstantiationDoc() {
  const baseUrl =
    typeof window !== "undefined"
      ? "https://sysc.sonicpesa.com"
      : "https://sysc.sonicpesa.com";

  return (
    <>
      <DocPageTitle
        title="2. Request payment API access"
        description="API credentials belong to a container — a merchant account, in effect. Before you can request a key, you need one."
      />

      <DocSection title="Instantiate the merchant-account container">
        <p>
          Using the Bearer token from account creation, request a container from
          the platform's own merchant-account template:
        </p>
        <CodeBlock>{`POST ${baseUrl}/api/provisioning/templates/<template_code>/instantiate/
Authorization: Bearer <access_token>

{
  "name": "Your Business Name"
}`}</CodeBlock>
        <Callout tone="warning">
          <code>&lt;template_code&gt;</code> is specific to this platform's own
          setup — ask your account contact which template code to use for a
          payment API merchant account. It isn't a fixed, universal value.
        </Callout>
      </DocSection>

      <DocSection title="If a KYC form is required">
        <p>
          Depending on how the template is configured, instantiating it may
          require you to submit KYC information as part of the same request — a
          business registration number, contact details, whatever the platform
          requires to approve a merchant account. When this applies, the request
          above needs a <code>form_answers</code> field:
        </p>
        <CodeBlock>{`{
  "name": "Your Business Name",
  "form_answers": {
    "business_name": "...",
    "registration_number": "...",
    "contact_phone": "..."
  }
}`}</CodeBlock>
        <p className="mt-3">
          The exact fields required depend on the form configured for this
          template — your account contact can tell you what's expected, or
          you'll receive a clear error naming what's missing if you submit
          without it.
        </p>
      </DocSection>

      <DocSection title="What you get back">
        <p>Two possible outcomes, depending on whether approval is required:</p>
        <CodeBlock>{`// Approved automatically
201 Created
{ "id": "<container_id>", "display_name": "Your Business Name", ... }

// Requires manual review first
202 Accepted
{ "type": "instantiation_request", "request_id": "<id>", "status": "pending" }`}</CodeBlock>
        <p className="mt-3">
          If you get a pending request, there's nothing further to do but wait —
          you'll be able to proceed to section 3 once it's approved. You can
          check its status any time:
        </p>
        <CodeBlock>{`GET ${baseUrl}/api/provisioning/my-instantiation-requests/
Authorization: Bearer <access_token>`}</CodeBlock>
      </DocSection>
    </>
  );
}
