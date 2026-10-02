import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import type { PaymentOption } from "../../lib/sdk/domains/paymentMethods";
import { ApiError } from "../../lib/query/Api";

/**
 * Fully generic, schema-driven — this component has never heard of
 * AzamPay, Selcom, Flutterwave, or Vodacom, and never will. It shows
 * whatever methods `listOptions` returns, renders whatever fields each
 * method's schema says, and validates the chosen method with the
 * backend right before handing collected values up to the caller.
 * Adding a new payment method anywhere in the system never requires
 * touching this file.
 */

interface PaymentMethodPickerProps {
  containerId: string;
  purpose: string;
  /** Called once a method has been chosen, its fields filled in and
   * pattern-validated client-side, AND the backend has confirmed it's
   * actually usable right now. This component does not perform the
   * actual payment — that's the caller's job (and, as of this
   * delivery, still unbuilt — see the wiring notes). */
  onReady: (methodCode: string, values: Record<string, string>) => void;
  submitLabel?: string;
}

export function PaymentMethodPicker({ containerId, purpose, onReady, submitLabel = "Continue" }: PaymentMethodPickerProps) {
  const { data: options, isLoading, isError } = useQuery({
    queryKey: ["payment-options", containerId, purpose],
    queryFn: () => sdk.paymentMethods.listOptions(containerId, purpose),
  });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  const selected: PaymentOption | undefined = options?.find((o) => o.method_code === selectedCode) ?? (options?.length === 1 ? options[0] : undefined);

  const validate = useMutation({
    mutationFn: () => sdk.paymentMethods.validateMethod(containerId, purpose, selected!.method_code),
    onSuccess: () => onReady(selected!.method_code, values),
    onError: (err) => setUnavailableMessage(err instanceof ApiError ? err.message : "This payment method isn't available right now — please try another."),
  });

  if (isLoading) return <p className="text-sm text-neutral-500">Loading payment options…</p>;
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Couldn't load payment options.</p>;
  if (!options || options.length === 0) return <p className="text-sm text-neutral-500">No payment methods are available right now.</p>;

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const onSelect = (code: string) => {
    setSelectedCode(code);
    setValues({});
    setFieldErrors({});
    setUnavailableMessage(null);
  };

  const onSubmit = () => {
    if (!selected) return;
    const errors: Record<string, string> = {};
    for (const field of selected.fields) {
      const value = (values[field.name] ?? "").trim();
      if (field.required && !value) {
        errors[field.name] = `${field.label} is required.`;
        continue;
      }
      if (value && field.pattern && !new RegExp(field.pattern).test(value)) {
        errors[field.name] = `${field.label} doesn't look right.`;
      }
    }
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    setUnavailableMessage(null);
    validate.mutate();
  };

  return (
    <div className="space-y-4">
      {options.length > 1 && (
        <div className="flex gap-2">
          {options.map((o) => (
            <button
              key={o.method_code} type="button" onClick={() => onSelect(o.method_code)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                selectedCode === o.method_code
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          {selected.fields.map((field) => (
            <div key={field.name}>
              <label className="text-xs font-medium text-neutral-500">{field.label}</label>
              <input
                type={field.field_type === "tel" ? "tel" : "text"} value={values[field.name] ?? ""}
                onChange={(e) => setValue(field.name, e.target.value)} placeholder={field.placeholder}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
              />
              {fieldErrors[field.name] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[field.name]}</p>}
            </div>
          ))}

          {unavailableMessage && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{unavailableMessage}</p>
          )}

          <button
            type="button" onClick={onSubmit} disabled={validate.isPending}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {validate.isPending ? "Checking…" : submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
