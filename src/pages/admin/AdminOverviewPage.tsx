import { useAuth } from "../../hooks/useAuth";
import {
  Users,
  Settings,
  FileText,
  Activity,
  ArrowRight,
  Link,
} from "lucide-react";

const quickLinks = [
  {
    label: "Actors",
    description: "Manage admin and system actors",
    icon: Users,
    href: "/admin/actors",
  },
  {
    label: "Settings",
    description: "Configure system-wide options",
    icon: Settings,
    href: "/admin/settings",
  },
  {
    label: "Logs",
    description: "Review recent activity and audit trails",
    icon: FileText,
    href: "/admin/logs",
  },
  {
    label: "Status",
    description: "Check system and API health",
    icon: Activity,
    href: "/admin/status",
  },
];

export default function AdminOverviewPage() {
  const { actor } = useAuth();

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <header className="mb-10">
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
          Overview
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Welcome back, {actor?.display_name ?? "Admin"}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Use navigation to explore available options.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
          Quick links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map(({ label, description, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {label}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-neutral-300 dark:text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-400" />
                </div>
                <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
