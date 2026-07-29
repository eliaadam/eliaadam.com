import { useAuth } from "../../hooks/useAuth";

export default function ProfileSection() {
  const { actor, isAdmin } = useAuth();
  if (!actor) return null;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white m-0">
          Profile
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Your actor identity on Sonic.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xl font-semibold flex-shrink-0">
            {actor.display_name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-black dark:text-white m-0 truncate">
              {actor.display_name}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {actor.code ?? "No code"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={actor.status} />
          {isAdmin && (
            <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide bg-black text-white dark:bg-white dark:text-black">
              System Admin
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-black dark:text-white mb-4">
          Actor Details
        </h3>
        <div className="flex flex-col gap-3">
          <DetailRow label="Actor ID" value={actor.id} mono />
          <DetailRow label="Display Name" value={actor.display_name} />
          <DetailRow label="Code" value={actor.code ?? "—"} />
          <DetailRow label="Status" value={actor.status} />
          <DetailRow label="Type ID" value={actor.actor_type_id || "—"} mono />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const base =
    "inline-block px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide";
  if (status === "active") {
    return (
      <span
        className={`${base} bg-black text-white dark:bg-white dark:text-black`}
      >
        {status}
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        className={`${base} border border-black dark:border-white text-black dark:text-white`}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400`}
    >
      {status}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-0 py-2 border-b border-neutral-100 dark:border-neutral-800">
      <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
        {label}
      </span>
      <span
        className={`text-sm text-black dark:text-white sm:text-right max-w-full sm:max-w-[60%] break-all ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
