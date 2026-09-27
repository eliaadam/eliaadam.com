import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * "Mine" — every actor-scoped view in one place: my own profile, my
 * direct reports, my pending approvals, my leave requests, my
 * upcoming interviews, my reviews to give. No permission needed for
 * any of these — same shape MyTasks/MyDeliveries take elsewhere in
 * this codebase.
 */
export function MyHR() {
  const { currentContainerId } = useContainer();

  const { data: profile } = useQuery({
    queryKey: ["hr", "my-profile", currentContainerId],
    queryFn: () => sdk.hr.getMyEmployeeProfile(currentContainerId ?? undefined),
    retry: false,
  });

  const { data: reports } = useQuery({
    queryKey: ["hr", "my-reports"],
    queryFn: () => sdk.hr.listMyDirectReports(),
  });

  const { data: pendingTimesheets } = useQuery({
    queryKey: ["hr", "my-pending-timesheets"],
    queryFn: () => sdk.hr.listTimesheetsPendingForMe(),
  });

  const { data: myLeaveRequests } = useQuery({
    queryKey: ["hr", "my-leave-requests"],
    queryFn: () => sdk.hr.listMyLeaveRequests("pending"),
  });

  const { data: myInterviews } = useQuery({
    queryKey: ["hr", "my-interviews"],
    queryFn: () => sdk.hr.listMyInterviews(),
  });

  const { data: myReviewsToGive } = useQuery({
    queryKey: ["hr", "my-reviews-to-give"],
    queryFn: () => sdk.hr.listMyReviewsToGive(),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">My HR</h1>

      {profile && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm font-medium">{profile.employee_number}</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            {profile.status}
          </p>
          <Link
            to={`/dashboard/hr/employees/${profile.id}`}
            className="mt-2 inline-block text-xs font-medium text-black hover:underline dark:text-white"
          >
            View my full profile →
          </Link>
        </div>
      )}

      <Section title="My direct reports" empty="No direct reports.">
        {reports?.map((r) => (
          <Link
            key={r.id}
            to={`/dashboard/hr/employees/${r.employee_id}`}
            className="block text-xs text-neutral-600 hover:underline dark:text-neutral-400"
          >
            {r.employment_type} · {r.status}
          </Link>
        ))}
      </Section>

      <Section title="Timesheets pending my approval" empty="Nothing pending.">
        {pendingTimesheets?.map((t) => (
          <p
            key={t.id}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {t.period_start} → {t.period_end}
          </p>
        ))}
      </Section>

      <Section title="My pending leave requests" empty="No pending requests.">
        {myLeaveRequests?.map((r) => (
          <p
            key={r.id}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {String(r.payload.start_date ?? "")} →{" "}
            {String(r.payload.end_date ?? "")}
          </p>
        ))}
      </Section>

      <Section title="My upcoming interviews" empty="No upcoming interviews.">
        {myInterviews?.map((i) => (
          <p
            key={i.id}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {i.scheduled_at
              ? new Date(i.scheduled_at).toLocaleString()
              : "Unscheduled"}{" "}
            · {i.status}
          </p>
        ))}
      </Section>

      <Section title="Reviews I owe" empty="Nothing to submit.">
        {myReviewsToGive?.map((r) => (
          <p
            key={r.id}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {r.review_type} · {r.status}
          </p>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasContent = items.some((c) => c);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        {hasContent ? (
          children
        ) : (
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}
