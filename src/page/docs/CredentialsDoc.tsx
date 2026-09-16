import {
  DocSection,
  StepList,
  Callout,
  DocPageTitle,
} from "../../components/docs/DocsPrimitives";

export function CredentialsDoc() {
  return (
    <>
      <DocPageTitle
        title="3. Credential creation"
        description="With a merchant account in hand, request the API key pair your developer will use for everything from section 4 onward."
      />

      <DocSection title="Requesting a key">
        <StepList
          steps={[
            {
              title: "Go to Payment Gateway → Credentials",
              description:
                "In your dashboard, open the Payment Gateway page and select the Credentials tab.",
            },
            {
              title: 'Click "Request a new key"',
              description:
                "This opens a small form asking which wallet to use and a label for the key.",
            },
            {
              title: "Choose a wallet",
              description:
                "Every payment collected with this key lands in exactly this wallet, and only this wallet. If you'll ever need to collect into more than one wallet, you'll request a separate key for each.",
            },
            {
              title: "Give it a label",
              description:
                'Something that tells you what it\'s for later — e.g. "Production" or "Test".',
            },
            {
              title: "Submit",
              description:
                "Depending on your account's configuration, the key is issued immediately, or the request is submitted for approval first — same as requesting the merchant account itself in section 2.",
            },
          ]}
        />
      </DocSection>

      <Callout tone="warning">
        <strong>The secret key is shown exactly once</strong>, right after it's
        issued — there is no way to retrieve it again afterward. Copy both the
        public key and secret key somewhere safe immediately, and hand them to
        your developer for section 4. If you lose the secret key, revoke that
        credential from the same Credentials tab and request a new one.
      </Callout>
    </>
  );
}
