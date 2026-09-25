import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { sdk } from "../../lib/sdk";

/**
 * The public carrier-discovery browse — open to any authenticated
 * actor, same "open discovery" shape Marketplace.tsx's own browse
 * tab already establishes. See the backend's own domain/entities.py
 * module docstring on why this is a dedicated endpoint rather than a
 * real surfacing.Listing browse — nothing is being purchased here,
 * the direction of payment (platform/vendor pays the carrier) is the
 * opposite of what a Listing models.
 */

export function Carriers() {
  const { data: carriers, isLoading } = useQuery({
    queryKey: ["logistics", "carriers"],
    queryFn: () => sdk.logistics.listCarriers(),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Carriers</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Containers offering delivery — what they carry, and how.
      </p>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {carriers && carriers.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Truck
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No carriers listed yet</p>
        </div>
      )}

      {carriers && carriers.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {carriers.map((c) => (
            <li key={c.id} className="px-4 py-3.5">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {c.description}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                {c.transport_modes.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
