import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { userApi } from "../../lib/system";

export default function QuickMenu() {
  const { actor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const membershipsQuery = useQuery({
    queryKey: ["user", "memberships"],
    queryFn: () => userApi.myMemberships(actor!.id),
    enabled: !!actor,
  });
  const discoverQuery = useQuery({
    queryKey: ["user", "discover"],
    queryFn: () => userApi.discoverContainers({ limit: 50 }),
  });

  const memberships = (membershipsQuery.data ?? []) as Array<{
    status: string;
  }>;
  const activeCount = memberships.filter((m) => m.status === "active").length;
  const pendingCount = memberships.filter((m) => m.status === "pending").length;
  const suspendedCount = memberships.filter(
    (m) => m.status === "suspended",
  ).length;
  const discoverableCount = (discoverQuery.data ?? []).length;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className="fixed top-[68px] right-4 lg:top-4 lg:right-6 z-50"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        className="w-10 h-10 rounded-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 shadow-md flex items-center justify-center text-black dark:text-white hover:border-black dark:hover:border-white transition"
      >
        <span className="text-lg leading-none tracking-widest">⋮</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600 mb-3">
              Stats
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatMini
                label="Active"
                value={activeCount}
                onClick={() => go("/home?tab=apps")}
              />
              <StatMini
                label="Pending"
                value={pendingCount}
                onClick={() => go("/home?tab=apps")}
              />
              <StatMini
                label="Suspended"
                value={suspendedCount}
                onClick={() => go("/home?tab=apps")}
              />
              <StatMini
                label="Discoverable"
                value={discoverableCount}
                onClick={() => go("/home?tab=dashboard")}
              />
            </div>
          </div>
          <div className="p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600 px-2 pt-2 pb-1">
              Quick Actions
            </p>
            <MenuItem
              icon="📦"
              label="Apps"
              onClick={() => go("/home?tab=apps")}
            />
            <MenuItem
              icon="✉️"
              label="Invitations"
              onClick={() => go("/home?tab=invitations")}
            />
            <MenuItem
              icon="🚀"
              label="Create"
              onClick={() => go("/home?tab=create")}
            />
            <MenuItem
              icon="👤"
              label="Profile"
              onClick={() => go("/home?tab=profile")}
            />
            {isAdmin && (
              <MenuItem
                icon="⌘"
                label="System Admin"
                onClick={() => go("/admin")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:border-black dark:hover:border-white transition"
    >
      <p className="text-base font-bold text-black dark:text-white m-0">
        {value}
      </p>
      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 m-0 uppercase tracking-wide">
        {label}
      </p>
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm font-medium text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white transition"
    >
      <span className="w-5 text-center">{icon}</span>
      {label}
    </button>
  );
}
