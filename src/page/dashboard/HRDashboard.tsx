import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { JobsTab } from "./hr/JobsTab";
import { EmployeesTab } from "./hr/EmployeesTab";
import { RecruitmentTab } from "./hr/RecruitmentTab";
import { AttendanceTab } from "./hr/AttendanceTab";
import { LeaveTab } from "./hr/LeaveTab";
import { CompensationTab } from "./hr/CompensationTab";
import { PerformanceTab } from "./hr/PerformanceTab";
import { LearningTab } from "./hr/LearningTab";
import { CareerTab } from "./hr/CareerTab";
import { EmployeeRelationsTab } from "./hr/EmployeeRelationsTab";

/**
 * HR dashboard shell — ten tabs, matching the backend's own ten
 * permission resources exactly (core.hr.job, .employee, .recruitment,
 * .attendance, .leave, .compensation, .performance, .learning,
 * .career, .employee_relations). Most depth lives on EmployeeDetail's
 * own routed page, not here — this shell covers the container-level
 * catalogs (jobs, skills, leave types, benefit plans, training
 * programs, shifts) and the recruitment pipeline.
 */

type Tab =
  | "jobs"
  | "employees"
  | "recruitment"
  | "attendance"
  | "leave"
  | "compensation"
  | "performance"
  | "learning"
  | "career"
  | "relations";

const TABS: { key: Tab; label: string }[] = [
  { key: "jobs", label: "Jobs & Positions" },
  { key: "employees", label: "Employees" },
  { key: "recruitment", label: "Recruitment" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "compensation", label: "Compensation" },
  { key: "performance", label: "Performance" },
  { key: "learning", label: "Learning" },
  { key: "career", label: "Career" },
  { key: "relations", label: "Employee Relations" },
];

export function HRDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("employees");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — HR data belongs to whichever container you're
        currently in.
      </p>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">HR</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Workforce, employment, recruitment, attendance, leave, and more.
      </p>

      <div className="mt-4 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "jobs" && <JobsTab containerId={currentContainerId} />}
        {activeTab === "employees" && (
          <EmployeesTab containerId={currentContainerId} />
        )}
        {activeTab === "recruitment" && (
          <RecruitmentTab containerId={currentContainerId} />
        )}
        {activeTab === "attendance" && (
          <AttendanceTab containerId={currentContainerId} />
        )}
        {activeTab === "leave" && <LeaveTab containerId={currentContainerId} />}
        {activeTab === "compensation" && (
          <CompensationTab containerId={currentContainerId} />
        )}
        {activeTab === "performance" && (
          <PerformanceTab containerId={currentContainerId} />
        )}
        {activeTab === "learning" && (
          <LearningTab containerId={currentContainerId} />
        )}
        {activeTab === "career" && (
          <CareerTab containerId={currentContainerId} />
        )}
        {activeTab === "relations" && (
          <EmployeeRelationsTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}
