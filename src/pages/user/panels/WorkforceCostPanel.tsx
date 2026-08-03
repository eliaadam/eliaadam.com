import { useQuery } from "@tanstack/react-query";
import { hrApi as api, toMajor } from "./hr-api";

export default function WorkforceCostPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  if (!can("system.hr.cost.view")) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        You don't have permission to view workforce cost.
      </div>
    );
  }

  const cost = useQuery({
    queryKey: ["hr", "cost", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/workforce/cost`),
  });

  if (cost.isLoading)
    return <div className="p-4 text-sm text-neutral-500">Loading…</div>;
  if (cost.isError)
    return (
      <div className="p-4 text-sm text-red-600">
        {(cost.error as any)?.message}
      </div>
    );

  const summary = cost.data?.summary ?? {};
  const lines = Array.isArray(cost.data?.lines) ? cost.data.lines : [];
  const byType: Record<string, number> = summary.by_actor_type ?? {};
  const fixed: Record<string, { amount: number; count: number }> =
    summary.fixed_periodic ?? {};
  const metered = summary.metered ?? { count: 0, by_unit: {} };

  return (
    <div className="p-4 space-y-5">
      {/* Headline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Headcount" value={String(summary.headcount ?? 0)} />
        <Card
          label="Humans"
          value={String(byType.user ?? 0)}
          sub="user actors"
        />
        <Card
          label="Agents"
          value={String((byType.bot ?? 0) + (byType.service ?? 0))}
          sub="bot / service"
        />
        <Card label="Unpaid" value={String(summary.unpaid ?? 0)} />
      </div>

      {/* Salary totals */}
      <section>
        <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
          Salary (fixed periodic)
        </h3>
        {Object.keys(fixed).length === 0 ? (
          <p className="text-xs text-neutral-400">No salaried assignments.</p>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
            {Object.entries(fixed).map(([key, v]) => {
              const [currency, period] = key.split(":");
              return (
                <div
                  key={key}
                  className="flex justify-between px-3 py-2 text-sm"
                >
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {v.count} worker(s) · per {period}
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    {toMajor(v.amount)} {currency}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Metered / token cost */}
      <section>
        <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
          Metered (tokens / usage)
        </h3>
        {metered.count === 0 ? (
          <p className="text-xs text-neutral-400">No metered assignments.</p>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
            {Object.entries(metered.by_unit as Record<string, any>).map(
              ([unit, v]) => (
                <div
                  key={unit}
                  className="flex justify-between px-3 py-2 text-sm"
                >
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {v.count} agent(s) · per {unit}
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    budget {toMajor(v.budget_sum)}
                    {v.rate_sum ? ` · rate Σ ${toMajor(v.rate_sum)}` : ""}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
        <p className="mt-1 text-[11px] text-neutral-400">
          Configured budget/rate — live consumption arrives with token metering.
        </p>
      </section>

      {/* Per-worker lines */}
      <section>
        <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
          Workers
        </h3>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {lines.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No active assignments.
            </div>
          ) : (
            lines.map((l: any) => (
              <div
                key={l.assignment_id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="text-black dark:text-white">
                  {l.display_name ?? l.actor_id?.slice(0, 8)}
                  <span className="text-[11px] text-neutral-400">
                    {" "}
                    {l.actor_type} · {l.position ?? "—"}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  {lineComp(l.compensation)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className="text-xl font-semibold text-black dark:text-white">
        {value}
      </div>
      {sub && <div className="text-[10px] text-neutral-400">{sub}</div>}
    </div>
  );
}

function lineComp(c: any): string {
  if (!c || c.type === "none") return "unpaid";
  if (c.type === "fixed_periodic")
    return `${toMajor(c.amount)} ${c.currency}/${c.period}`;
  if (c.type === "metered")
    return `${toMajor(c.rate)} ${c.currency}/${c.unit}${c.budget ? ` · budget ${toMajor(c.budget)}` : ""}`;
  return String(c.type);
}
