import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brainstormApi as api, toMajor } from "./brainstorm-api";
import ChallengePlayer from "./ChallengePlayer";
import CreateChallengeForm from "./CreateChallengeForm";

type Challenge = {
  id: string; title: string; type: string; status: string;
  award_total: number; award_currency: string; entry_fee: number; max_score: number;
};

/** Brainstorm workspace — author list + create + play. */
export default function BrainstormWorkspace({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canManage = can("system.brainstorm.challenge.manage");
  const canAttempt = can("system.brainstorm.challenge.attempt");

  const challenges = useQuery({
    queryKey: ["brainstorm", "challenges", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/challenges`),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api("POST", `/containers/${containerId}/challenges/${id}/${action}`),
    onSuccess: (_d, v) => { setMsg(`Challenge ${v.action}d.`); qc.invalidateQueries({ queryKey: ["brainstorm", "challenges", containerId] }); },
    onError: (e: any) => setMsg(e.message),
  });

  if (playing) {
    return <ChallengePlayer containerId={containerId} challengeId={playing} onClose={() => setPlaying(null)} />;
  }
  if (creating) {
    return <CreateChallengeForm containerId={containerId} onClose={() => setCreating(false)}
      onCreated={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["brainstorm", "challenges", containerId] }); }} />;
  }

  const list: Challenge[] = Array.isArray(challenges.data) ? challenges.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}
      {canManage && <button onClick={() => setCreating(true)} className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black">+ New challenge</button>}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {challenges.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">No challenges yet.</div>
        ) : (
          list.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {c.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{c.type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === "open" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : c.status === "resolved" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>{c.status}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {c.award_total > 0 && <span className="text-green-600">award {toMajor(c.award_total)} {c.award_currency}</span>}
                  {c.entry_fee > 0 && <span> · entry {toMajor(c.entry_fee)} {c.award_currency}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                {c.status === "open" && canAttempt && <button onClick={() => setPlaying(c.id)} className="px-2 py-1 text-[11px] rounded bg-black text-white dark:bg-white dark:text-black">Play</button>}
                {canManage && c.status === "draft" && <button onClick={() => act.mutate({ id: c.id, action: "open" })} className="px-2 py-1 text-[11px] rounded border border-green-400 text-green-700 dark:text-green-400">Open</button>}
                {canManage && c.status === "open" && <button onClick={() => act.mutate({ id: c.id, action: "resolve" })} className="px-2 py-1 text-[11px] rounded border border-blue-400 text-blue-700 dark:text-blue-400">Resolve</button>}
                {canManage && ["draft", "open"].includes(c.status) && <button onClick={() => act.mutate({ id: c.id, action: "cancel" })} className="px-2 py-1 text-[11px] rounded border border-red-300 text-red-600">Cancel</button>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
