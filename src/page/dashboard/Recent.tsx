import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { ApiError } from "../../lib/query/Api";
import { sdk } from "../../lib/sdk";

function useRecentAssets() {
  return useQuery({
    queryKey: ["registry", "recent-assets"],
    queryFn: () => sdk.registry.listAssets({ perPage: 10 }),
  });
}

function statusClasses(status: string): string {
  if (status === "active") {
    return "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400";
  }
  if (status === "deprecated" || status === "retired") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

export function Recent() {
  const { data, isLoading, isError, error } = useRecentAssets();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Recent</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        The most recently registered items in your catalogue.
      </p>

      <div className="mt-6">
        {isLoading && (
          <ul className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </ul>
        )}

        {isError && (
          <div className="rounded-lg border border-slate-200 p-6 text-sm dark:border-slate-800">
            <p className="font-medium">Couldn't load recent items.</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {error instanceof ApiError
                ? error.message
                : "Check that the API server is running and try again."}
            </p>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <PackageSearch
              className="mx-auto text-slate-400 dark:text-slate-600"
              size={22}
            />
            <p className="mt-3 text-sm font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Items you register will show up here.
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {data.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                    {asset.code} · {asset.asset_type}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(asset.status)}`}
                >
                  {asset.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
