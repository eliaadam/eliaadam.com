import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";

/**
 * "Mine" — every actor-scoped CRM view in one place: accounts I own,
 * leads I own, my pipeline, my open activities, cases assigned to me.
 * No permission needed for any of these — same shape MyHR/MyTasks
 * take elsewhere in this codebase.
 */
export function MyCRM() {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ["crm", "my-accounts"],
    queryFn: () => sdk.crm.listMyAccounts(),
  });
  const { data: leads } = useQuery({
    queryKey: ["crm", "my-leads"],
    queryFn: () => sdk.crm.listMyLeads(),
  });
  const { data: opportunities } = useQuery({
    queryKey: ["crm", "my-opportunities"],
    queryFn: () => sdk.crm.listMyOpportunities(),
  });
  const { data: activities } = useQuery({
    queryKey: ["crm", "my-activities"],
    queryFn: () => sdk.crm.listMyActivities(true),
  });
  const { data: cases } = useQuery({
    queryKey: ["crm", "my-cases"],
    queryFn: () => sdk.crm.listMyCases(),
  });

  const completeMutation = useMutation({
    mutationFn: (activityId: string) => sdk.crm.completeActivity(activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm", "my-activities"] }),
  });

  const openOpportunities = opportunities?.filter(
    (o) => o.stage !== "closed_won" && o.stage !== "closed_lost",
  );
  const openCases = cases?.filter((c) => c.status !== "closed");

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">My CRM</h1>

      <Section title="My open activities" empty="Nothing open." hasItems={Boolean(activities?.length)}>
        {activities?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span>
              <span className="font-medium capitalize">{a.activity_type}</span>
              {a.subject && ` — ${a.subject}`}
              {a.due_at && ` · due ${new Date(a.due_at).toLocaleString()}`}
            </span>
            {a.activity_type === "task" && (
              <button
                type="button"
                onClick={() => completeMutation.mutate(a.id)}
                disabled={completeMutation.isPending}
                className="flex-none text-xs font-medium text-black hover:underline dark:text-white"
              >
                Done
              </button>
            )}
          </div>
        ))}
      </Section>

      <Section title="My pipeline" empty="No open opportunities." hasItems={Boolean(openOpportunities?.length)}>
        {openOpportunities?.map((o) => (
          <Link
            key={o.id}
            to={`/dashboard/crm/accounts/${o.account_id}`}
            className="block text-xs text-neutral-600 hover:underline dark:text-neutral-400"
          >
            {o.name} · {o.stage}
            {o.amount != null && ` · ${o.currency ?? ""} ${o.amount.toLocaleString()}`}
          </Link>
        ))}
      </Section>

      <Section title="My leads" empty="No leads assigned to you." hasItems={Boolean(leads?.length)}>
        {leads?.map((l) => (
          <p key={l.id} className="text-xs text-neutral-600 dark:text-neutral-400">
            {l.full_name}
            {l.company_name && ` · ${l.company_name}`} · {l.status}
          </p>
        ))}
      </Section>

      <Section title="My accounts" empty="No accounts assigned to you." hasItems={Boolean(accounts?.length)}>
        {accounts?.map((a) => (
          <Link
            key={a.id}
            to={`/dashboard/crm/accounts/${a.id}`}
            className="block text-xs text-neutral-600 hover:underline dark:text-neutral-400"
          >
            {a.name} · {a.status}
          </Link>
        ))}
      </Section>

      <Section title="Cases assigned to me" empty="No open cases." hasItems={Boolean(openCases?.length)}>
        {openCases?.map((c) => (
          <p key={c.id} className="text-xs text-neutral-600 dark:text-neutral-400">
            {c.subject} · {c.priority} · {c.status}
          </p>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  hasItems,
  children,
}: {
  title: string;
  empty: string;
  hasItems: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        {hasItems ? children : <p className="text-xs text-neutral-400 dark:text-neutral-600">{empty}</p>}
      </div>
    </div>
  );
}
