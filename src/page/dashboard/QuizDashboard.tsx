import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { GamificationTab } from "./quiz/GamificationTab";
import { GradingTab } from "./quiz/GradingTab";
import { PoolsTab } from "./quiz/PoolsTab";
import { QuestionsTab } from "./quiz/QuestionsTab";
import { QuizzesTab } from "./quiz/QuizzesTab";
import { TakeQuizTab } from "./quiz/TakeQuizTab";
import { pillTabClass } from "./quiz/ui";

/** Quiz — generic structured interactions: questions, quizzes, taking,
 * grading, pools/adaptive rules, and gamification, across five
 * composed backend capabilities in one dashboard. */

type Tab =
  | "questions"
  | "pools"
  | "quizzes"
  | "take"
  | "grading"
  | "gamification";

const TABS: [Tab, string][] = [
  ["questions", "Question Bank"],
  ["pools", "Pools"],
  ["quizzes", "Quizzes"],
  ["take", "Take a Quiz"],
  ["grading", "Grading"],
  ["gamification", "Gamification"],
];

export function QuizDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("quizzes");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Quiz</h1>

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
        {activeTab === "questions" && (
          <QuestionsTab containerId={currentContainerId} />
        )}
        {activeTab === "pools" && <PoolsTab containerId={currentContainerId} />}
        {activeTab === "quizzes" && (
          <QuizzesTab containerId={currentContainerId} />
        )}
        {activeTab === "take" && (
          <TakeQuizTab containerId={currentContainerId} />
        )}
        {activeTab === "grading" && (
          <GradingTab containerId={currentContainerId} />
        )}
        {activeTab === "gamification" && (
          <GamificationTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}
