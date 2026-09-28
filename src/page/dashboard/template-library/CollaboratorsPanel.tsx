import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { CollaboratorRole } from "../../../lib/sdk/domains/templateLibrary";
import { errorMessage, errorTextClass, inputClass, secondaryButtonClass, dangerButtonClass } from "./ui";

export function CollaboratorsPanel({ templateId, isOwner }: { templateId: string; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const key = ["template-library", "collaborators", templateId];
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const [actorId, setActorId] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");

  const { data: collaborators } = useQuery({
    queryKey: key,
    queryFn: () => sdk.templateLibrary.listCollaborators(templateId),
  });

  const add = useMutation({
    mutationFn: () => sdk.templateLibrary.addCollaborator(templateId, actorId.trim(), role),
    onSuccess: () => {
      refresh();
      setActorId("");
    },
  });
  const change = useMutation({
    mutationFn: (v: { id: string; role: CollaboratorRole }) =>
      sdk.templateLibrary.changeCollaboratorRole(templateId, v.id, v.role),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.templateLibrary.removeCollaborator(templateId, id),
    onSuccess: refresh,
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Owners manage people, visibility and archiving. Editors can change content and publish.
      </p>

      <ul className="flex flex-col gap-1.5">
        {collaborators?.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-neutral-700 dark:text-neutral-300">{c.actor_id.slice(0, 8)}…</span>
            {isOwner ? (
              <span className="flex items-center gap-2">
                <select
                  className={`${inputClass} max-w-[7rem] py-1 text-xs`}
                  value={c.role}
                  onChange={(e) => change.mutate({ id: c.id, role: e.target.value as CollaboratorRole })}
                >
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                </select>
                <button type="button" onClick={() => remove.mutate(c.id)} disabled={remove.isPending} className={dangerButtonClass}>
                  Remove
                </button>
              </span>
            ) : (
              <span className="text-neutral-500 dark:text-neutral-500">{c.role}</span>
            )}
          </li>
        ))}
      </ul>
      {(change.isError || remove.isError) && (
        <p className={errorTextClass}>{errorMessage(change.error ?? remove.error)}</p>
      )}

      {isOwner && (
        <div className="flex items-center gap-2">
          <input className={`${inputClass} text-xs`} placeholder="Actor id…" value={actorId} onChange={(e) => setActorId(e.target.value)} />
          <select className={`${inputClass} max-w-[7rem] text-xs`} value={role} onChange={(e) => setRole(e.target.value as CollaboratorRole)}>
            <option value="editor">editor</option>
            <option value="owner">owner</option>
          </select>
          <button type="button" onClick={() => add.mutate()} disabled={!actorId.trim() || add.isPending} className={`flex-none ${secondaryButtonClass}`}>
            Add
          </button>
        </div>
      )}
      {add.isError && <p className={errorTextClass}>{errorMessage(add.error, "Couldn't add that person.")}</p>}
    </div>
  );
}
