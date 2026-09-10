import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { type InitiateResult, sdk } from "../../lib/sdk";
import type {
  NextAction,
  AuthorizationInput,
} from "../../lib/sdk/domains/payment";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * `nextAction` only ever comes from the calling page's own local
 * state (the last `initiateIntent()`/`continueAuthorization()`
 * response) — it is NOT persisted server-side and can't be re-fetched
 * from `getIntent()`. Reloading mid-flow loses it; "Check status now"
 * (reconcile) will still eventually resolve the charge itself, just
 * without re-surfacing this specific prompt. See `lib/sdk/payment.ts`'s
 * own note on `NextAction` for why that's a deliberate backend
 * trade-off, not a bug here.
 *
 * A successful `continueAuthorization()` call can itself return
 * ANOTHER `next_action` (e.g. PIN then OTP, one after another) —
 * `onResolved` hands the whole `InitiateResult` back up so the parent
 * can swap in whatever comes next, the same way it handled the first
 * one.
 */
export function NextActionPanel({
  intentId,
  nextAction,
  onResolved,
}: {
  intentId: string;
  nextAction: NextAction | null;
  onResolved: (result: InitiateResult) => void;
}) {
  const mutation = useMutation({
    mutationFn: (authorization: AuthorizationInput) =>
      sdk.payment.continueAuthorization(intentId, authorization),
    onSuccess: onResolved,
  });

  if (!nextAction) return null;

  switch (nextAction.type) {
    case "redirect_url":
      return (
        <a
          href={nextAction.redirect_url.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ExternalLink size={14} />
          Continue to payment
        </a>
      );

    case "payment_instruction":
      return (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {nextAction.payment_instruction.note}
        </p>
      );

    case "requires_requery":
      return (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          Still finalizing with the bank — this can take up to a minute. Use
          "Check status now" below, or wait; this page checks automatically
          while a payment is processing.
        </p>
      );

    case "requires_pin":
      return (
        <PinForm
          onSubmit={(pin) => mutation.mutate({ type: "pin", pin: { pin } })}
          isPending={mutation.isPending}
          isError={mutation.isError}
        />
      );

    case "requires_otp":
      return (
        <OtpForm
          onSubmit={(code) => mutation.mutate({ type: "otp", otp: { code } })}
          isPending={mutation.isPending}
          isError={mutation.isError}
        />
      );

    case "requires_additional_fields":
      return (
        <AvsForm
          fields={nextAction.requires_additional_fields.fields}
          onSubmit={(address) =>
            mutation.mutate({ type: "avs", avs: { address } })
          }
          isPending={mutation.isPending}
          isError={mutation.isError}
        />
      );

    default:
      return null;
  }
}

function PinForm({
  onSubmit,
  isPending,
  isError,
}: {
  onSubmit: (pin: string) => void;
  isPending: boolean;
  isError: boolean;
}) {
  const [pin, setPin] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(pin);
      }}
      className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <p className="text-sm font-medium">Enter your card PIN</p>
      <input
        className={inputClass}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        required
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <SubmitRow isPending={isPending} isError={isError} label="Submit PIN" />
    </form>
  );
}

function OtpForm({
  onSubmit,
  isPending,
  isError,
}: {
  onSubmit: (code: string) => void;
  isPending: boolean;
  isError: boolean;
}) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
      className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <p className="text-sm font-medium">Enter the one-time code sent to you</p>
      <input
        className={inputClass}
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <SubmitRow isPending={isPending} isError={isError} label="Submit code" />
    </form>
  );
}

function AvsForm({
  fields,
  onSubmit,
  isPending,
  isError,
}: {
  fields: string[];
  onSubmit: (address: {
    city: string;
    country: string;
    line1: string;
    line2?: string;
    postal_code: string;
    state: string;
  }) => void;
  isPending: boolean;
  isError: boolean;
}) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          line1,
          line2: line2 || undefined,
          city,
          state,
          postal_code: postalCode,
          country,
        });
      }}
      className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <p className="text-sm font-medium">
        Confirm the billing address on this card
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Requested: {fields.join(", ") || "address"}
      </p>
      <input
        className={inputClass}
        placeholder="Address line 1"
        required
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Address line 2 (optional)"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="City"
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="State"
          required
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Postal code"
          required
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <input
          className={`${inputClass} w-24 uppercase`}
          placeholder="Country"
          maxLength={2}
          required
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />
      </div>
      <SubmitRow
        isPending={isPending}
        isError={isError}
        label="Submit address"
      />
    </form>
  );
}

function SubmitRow({
  isPending,
  isError,
  label,
}: {
  isPending: boolean;
  isError: boolean;
  label: string;
}) {
  return (
    <>
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          That didn't go through — check the details and try again.
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {isPending ? "Submitting…" : label}
      </button>
    </>
  );
}
