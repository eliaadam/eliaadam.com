import {
  DocPageTitle,
  DocSection,
  StepList,
  Callout,
} from "../../components/payment-gateway/DocsPrimitives";

export function AccountCreationDoc() {
  return (
    <>
      <DocPageTitle
        title="1. Account creation"
        description="Everything below this page assumes you already have a platform account. Start here if you don't."
      />

      <DocSection title="Sign up">
        <StepList
          steps={[
            {
              title: "Go to the sign-up page",
              description:
                "Open the platform's sign-up page and choose to create a new account.",
            },
            {
              title: "Enter your details",
              description:
                "Your email address, a password, and your name (or your business's name).",
            },
            {
              title: "Submit",
              description:
                "Your account is created and you're signed in immediately — no separate email verification step required before you can start working.",
            },
          ]}
        />
      </DocSection>

      <DocSection title="Log in later">
        <p>
          Once you have an account, return to the sign-in page any time with the
          same email and password.
        </p>
      </DocSection>

      <Callout>
        Everything from here on happens inside the dashboard, using the account
        you just created — sections 2, 3, and 7 are all things you do by
        clicking through the dashboard's own UI, not API calls. Sections 4
        through 6 are for whoever on your team is actually integrating your
        server against the collection API.
      </Callout>
    </>
  );
}
