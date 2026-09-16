import {
  DocSection,
  StepList,
  Callout,
  DocPageTitle,
} from "../../components/docs/DocsPrimitives";

export function PayoutsDoc() {
  return (
    <>
      <DocPageTitle
        title="7. Payout requests"
        description="Moving money collected in your wallet out to a bank account or mobile money number — all from the dashboard, no API calls needed."
      />

      <DocSection title="Requesting a payout">
        <StepList
          steps={[
            {
              title: "Go to Payment → Payouts",
              description:
                "In your dashboard, open the Payment page and select the Payouts tab.",
            },
            {
              title: "Choose the source wallet",
              description:
                "Which of your wallets the payout draws from, and the amount.",
            },
            {
              title: "Choose a destination",
              description:
                "A bank account or a mobile money number, depending on what you select.",
            },
            {
              title: "Submit the request",
              description:
                "This records the payout. A payout can settle across more than one step if needed — the dashboard shows its status and lets you release it once it's ready.",
            },
          ]}
        />
      </DocSection>

      <Callout>
        A payout doesn't always resolve in one clean step — a partial result is
        a normal, expected outcome, not an error. The Payouts tab shows exactly
        where each request stands and lets you act on whatever's still
        outstanding.
      </Callout>
    </>
  );
}
