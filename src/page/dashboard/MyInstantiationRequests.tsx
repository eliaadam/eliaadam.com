import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Boxes } from "lucide-react";
import { sdk } from "../../lib/sdk";

const STATUS_STYLES: Record<"pending" | "approved" | "rejected", string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  approved: "bg-black text-white dark:bg-white dark:text-black",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

/**
 * The gap this closes: `InstantiationRequests.tsx` answers "who wants
 * to instantiate THIS template" (for whoever could approve). This
 * answers the other question — "what's the status of MY OWN
 * requests" — across every template, for the requester, who otherwise
 * had no way to ever check back after submitting one.
 */
export function MyInstantiationRequests() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["provisioning", "my-instantiation-requests"],
    queryFn: () => sdk.provisioning.listMyInstantiationRequests(),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">
        My instantiation requests
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every template instantiation you've requested, and its current status.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Boxes
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No requests yet</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Requesting an instantiation for a template that requires approval
            will show up here.
          </p>
          <Link
            to="/dashboard/templates"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Browse templates
          </Link>
        </div>
      )}

      {requests && requests.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.payload.template_code}
                    {r.payload.name ? ` · "${r.payload.name}"` : ""}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {r.payload.parent_container_id === null
                      ? "New root container"
                      : "Sub-container"}
                    {r.requested_at &&
                      ` · Requested ${new Date(r.requested_at).toLocaleString()}`}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              {r.decision_reason && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">
                    {r.status === "approved" ? "Note" : "Reason"}:
                  </span>{" "}
                  {r.decision_reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
