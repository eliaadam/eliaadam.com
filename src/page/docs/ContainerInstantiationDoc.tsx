import {
  DocSection,
  StepList,
  Callout,
  DocPageTitle,
} from "../../components/docs/DocsPrimitives";

export function ContainerInstantiationDoc() {
  return (
    <>
      <DocPageTitle
        title="2. Request payment API access"
        description="API credentials belong to a container — a merchant account, in effect. Before you can request a key, you need one."
      />

      <DocSection title="Request a merchant account">
        <StepList
          steps={[
            {
              title: "Open the request form in your dashboard",
              description:
                "From your dashboard, find the option to request a merchant/payment-API account and open it.",
            },
            {
              title: "Fill in your details",
              description:
                "Your business name and whatever else the form asks for.",
            },
            {
              title: "Submit and wait for a decision",
              description:
                "Depending on how your account is configured, this is approved automatically or reviewed by the platform first — you'll be told which applies when you submit.",
            },
          ]}
        />
      </DocSection>

      <DocSection title="If a KYC form is required">
        <p>
          Some accounts require KYC information before a merchant account is
          approved — a business registration number, contact details, whatever
          the platform needs on file. When this applies, the request form itself
          includes those fields; you won't need to find them anywhere else.
        </p>
      </DocSection>

      <Callout>
        If your request needs manual review, there's nothing further to do but
        wait — you can check its status from the same place you submitted it.
        Once approved, move on to section 3.
      </Callout>
    </>
  );
}
