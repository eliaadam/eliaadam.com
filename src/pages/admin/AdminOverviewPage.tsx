import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function AdminOverviewPage() {
  const { actor } = useAuth();

  return (
    <div className="p-8 max-w-[960px]">
      <header className="mb-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Welcome back, {actor?.display_name ?? "Admin"}
        </p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        <StatCard
          icon="👤"
          label="Actors"
          description="Manage actors, types, credentials, and lifecycle"
          to="/admin/actors"
        />
        <StatCard
          icon="📦"
          label="Containers"
          description="Manage organizations, teams, hierarchy"
          to="/admin/containers"
        />
        <StatCard
          icon="🔑"
          label="Roles & Permissions"
          description="RBAC roles, permissions, assignments"
          to="/admin/roles"
          disabled
        />
        <StatCard
          icon="🛡"
          label="Authorization"
          description="Drivers, policies, authorization checks"
          to="/admin/authorization"
          disabled
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  description,
  to,
  disabled = false,
}: {
  icon: string;
  label: string;
  description: string;
  to: string;
  disabled?: boolean;
}) {
  const Tag = disabled ? "div" : "a";

  return (
    <Tag
      href={disabled ? undefined : to}
      onClick={
        disabled
          ? undefined
          : (e: React.MouseEvent) => {
              e.preventDefault();
              <Link to={to} />;
            }
      }
      className={`flex flex-col gap-2 p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl no-underline transition-colors ${
        disabled
          ? "opacity-50 cursor-default"
          : "cursor-pointer hover:border-black dark:hover:border-white"
      }`}
    >
      <span className="text-[28px]">{icon}</span>
      <h3 className="text-base font-semibold text-black dark:text-white m-0">
        {label}
      </h3>
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400 m-0 leading-relaxed">
        {description}
      </p>
      {disabled && (
        <span className="text-[11px] text-neutral-400 dark:text-neutral-600 uppercase tracking-wide font-semibold mt-1">
          Coming soon
        </span>
      )}
    </Tag>
  );
}
