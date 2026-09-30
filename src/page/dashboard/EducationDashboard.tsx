import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { AdmissionsTab } from "./education/AdmissionsTab";
import { AttendanceTab } from "./education/AttendanceTab";
import { GradingTab } from "./education/GradingTab";
import { SetupTab } from "./education/SetupTab";
import { StudentsTab } from "./education/StudentsTab";
import { pillTabClass } from "./education/ui";

/** Education — academic structure, admissions, students, attendance, and
 * grading for one institution (a container is one institution). */

type Tab = "setup" | "admissions" | "students" | "attendance" | "grading";

const TABS: [Tab, string][] = [
  ["setup", "Academic Setup"],
  ["admissions", "Admissions"],
  ["students", "Students"],
  ["attendance", "Attendance"],
  ["grading", "Grading"],
];

export function EducationDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("setup");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — everything here belongs to one institution.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Education</h1>

      <div className="mt-4 flex flex-wrap gap-1.5 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={pillTabClass(activeTab === key)}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === "setup" && <SetupTab containerId={currentContainerId} />}
        {activeTab === "admissions" && (
          <AdmissionsTab containerId={currentContainerId} />
        )}
        {activeTab === "students" && (
          <StudentsTab containerId={currentContainerId} />
        )}
        {activeTab === "attendance" && (
          <AttendanceTab containerId={currentContainerId} />
        )}
        {activeTab === "grading" && (
          <GradingTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}
