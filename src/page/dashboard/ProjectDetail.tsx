import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { OverviewTab } from "./projects/OverviewTab";
import { MilestonesTab } from "./projects/MilestonesTab";
import { TasksTab } from "./projects/TasksTab";
import { RisksTab } from "./projects/RisksTab";
import { BudgetTab } from "./projects/BudgetTab";
import { ActivityTab } from "./projects/ActivityTab";

/**
 * One project's own page — routed at /dashboard/projects/:projectId.
 * A project's content is substantial enough (milestones, tasks,
 * risks, budget, activity) to warrant its own page with sub-tabs
 * rather than expanding inline in the list view.
 */

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<
    "overview" | "milestones" | "tasks" | "risks" | "budget" | "activity"
  >("overview");

  const { data: project, isLoading } = useQuery({
    queryKey: ["projects", "detail", projectId],
    queryFn: () => sdk.projects.getProject(projectId!),
    enabled: Boolean(projectId),
  });

  if (!projectId) return null;

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  if (!project) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        This project couldn't be found.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
      {project.description && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {project.description}
        </p>
      )}

      <div className="mt-4 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-5">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </TabButton>
          <TabButton
            active={activeTab === "milestones"}
            onClick={() => setActiveTab("milestones")}
          >
            Milestones
          </TabButton>
          <TabButton
            active={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
          >
            Tasks
          </TabButton>
          <TabButton
            active={activeTab === "risks"}
            onClick={() => setActiveTab("risks")}
          >
            Risks
          </TabButton>
          <TabButton
            active={activeTab === "budget"}
            onClick={() => setActiveTab("budget")}
          >
            Budget
          </TabButton>
          <TabButton
            active={activeTab === "activity"}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </TabButton>
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "overview" && <OverviewTab project={project} />}
        {activeTab === "milestones" && <MilestonesTab projectId={projectId} />}
        {activeTab === "tasks" && <TasksTab projectId={projectId} />}
        {activeTab === "risks" && <RisksTab projectId={projectId} />}
        {activeTab === "budget" && <BudgetTab projectId={projectId} />}
        {activeTab === "activity" && <ActivityTab projectId={projectId} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-black text-black dark:border-white dark:text-white"
          : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
