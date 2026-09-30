import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  ActorState,
  Achievement,
} from "../../../lib/sdk/domains/quizGamification";
import {
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  pillTabClass,
  primaryButtonClass,
} from "./ui";

type SubTab = "progress" | "leaderboard" | "achievements";

export function GamificationTab({ containerId }: { containerId: string }) {
  const [sub, setSub] = useState<SubTab>("progress");
  return (
    <div>
      <div className="flex gap-1.5">
        {(
          [
            ["progress", "My Progress"],
            ["leaderboard", "Leaderboard"],
            ["achievements", "Achievements"],
          ] as [SubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={pillTabClass(sub === key)}
            onClick={() => setSub(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {sub === "progress" && <MyProgressPanel containerId={containerId} />}
        {sub === "leaderboard" && (
          <LeaderboardPanel containerId={containerId} />
        )}
        {sub === "achievements" && (
          <AchievementsPanel containerId={containerId} />
        )}
      </div>
    </div>
  );
}

function MyProgressPanel({ containerId }: { containerId: string }) {
  const { data: state, isLoading } = useQuery({
    queryKey: ["qg-my-state", containerId],
    queryFn: () => sdk.quizGamification.myState(containerId),
  });
  const { data: achievements } = useQuery({
    queryKey: ["qg-achievements", containerId],
    queryFn: () => sdk.quizGamification.achievements(containerId).list(),
  });

  if (isLoading || !state)
    return <p className="text-sm text-neutral-500">Loading…</p>;

  const unlocked =
    achievements?.filter((a) => state.achievement_codes.includes(a.code)) ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className={`${cardClass} p-4 text-center`}>
        <div className="text-3xl font-semibold">{state.total_xp}</div>
        <div className="text-xs text-neutral-500">Total XP</div>
      </div>
      <div className={`${cardClass} p-4 text-center`}>
        <div className="text-3xl font-semibold">{state.level}</div>
        <div className="text-xs text-neutral-500">Level</div>
      </div>
      <div className={`${cardClass} p-4 text-center`}>
        <div className="text-3xl font-semibold">{state.current_streak}</div>
        <div className="text-xs text-neutral-500">
          Day streak (best {state.longest_streak})
        </div>
      </div>
      <div className={`${cardClass} p-4 md:col-span-3`}>
        <h3 className="text-sm font-semibold">
          Achievements unlocked ({unlocked.length})
        </h3>
        {unlocked.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">None yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unlocked.map((a) => (
              <span key={a.id} className={badgeClass}>
                {a.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel({ containerId }: { containerId: string }) {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["qg-leaderboard", containerId],
    queryFn: () => sdk.quizGamification.leaderboard(containerId, 20),
  });
  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">XP</th>
            <th className="px-3 py-2 font-medium">Level</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                Loading…
              </td>
            </tr>
          )}
          {leaderboard?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                No activity yet.
              </td>
            </tr>
          )}
          {leaderboard?.map((s: ActorState, i: number) => (
            <tr
              key={s.actor_id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs">{s.actor_id}</td>
              <td className="px-3 py-2 font-medium">{s.total_xp}</td>
              <td className="px-3 py-2">{s.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AchievementsPanel({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: achievements, isLoading } = useQuery({
    queryKey: ["qg-achievements", containerId],
    queryFn: () => sdk.quizGamification.achievements(containerId).list(),
  });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [criteriaType, setCriteriaType] = useState<
    "total_xp" | "streak" | "attempts_evaluated"
  >("total_xp");
  const [criteriaValue, setCriteriaValue] = useState("100");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["qg-achievements", containerId],
    });
  const create = useMutation({
    mutationFn: () =>
      sdk.quizGamification.achievements(containerId).create({
        code: code.trim(),
        name: name.trim(),
        criteria: { type: criteriaType, value: Number(criteriaValue) },
      }),
    onSuccess: () => {
      setCode("");
      setName("");
      invalidate();
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
      <div className={cardClass}>
        {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
        {achievements?.length === 0 && (
          <p className="p-3 text-sm text-neutral-500">
            No achievements defined yet.
          </p>
        )}
        {achievements?.map((a: Achievement) => (
          <div
            key={a.id}
            className="border-b border-neutral-100 p-3 last:border-0 dark:border-neutral-900"
          >
            <div className="text-sm font-medium">{a.name}</div>
            <div className="text-xs text-neutral-500">
              {a.code} — {JSON.stringify(a.criteria)}
            </div>
          </div>
        ))}
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New achievement</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Code</label>
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="xp_1000"
            />
          </div>
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="1000 XP Club"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Unlock when</label>
              <select
                className={inputClass}
                value={criteriaType}
                onChange={(e) =>
                  setCriteriaType(e.target.value as typeof criteriaType)
                }
              >
                <option value="total_xp">Total XP reaches</option>
                <option value="streak">Streak reaches</option>
                <option value="attempts_evaluated">
                  Attempts evaluated reaches
                </option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Value</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={criteriaValue}
                onChange={(e) => setCriteriaValue(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className={`w-full ${primaryButtonClass}`}
            disabled={!code.trim() || !name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create achievement"}
          </button>
          {create.isError && (
            <p className={errorTextClass}>
              {errorMessage(create.error, "Couldn't create the achievement.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
