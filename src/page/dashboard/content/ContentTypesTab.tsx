import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { ContentType } from "../../../lib/sdk/domains/content";
import {
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

export function ContentTypesTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: types, isLoading } = useQuery({
    queryKey: ["content-types", containerId],
    queryFn: () => sdk.content.contentTypes(containerId).list(),
  });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["content-types", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.content
        .contentTypes(containerId)
        .create({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        }),
    onSuccess: () => {
      setCode("");
      setName("");
      setDescription("");
      invalidate();
    },
  });
  const toggleActive = useMutation({
    mutationFn: (t: ContentType) =>
      t.is_active
        ? sdk.content.contentTypes(containerId).deactivate(t.id)
        : sdk.content.contentTypes(containerId).activate(t.id),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {types?.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={5}>
                  No content types yet.
                </td>
              </tr>
            )}
            {types?.map((t: ContentType) => (
              <tr
                key={t.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
              >
                <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td
                  className="max-w-xs truncate px-3 py-2 text-neutral-600 dark:text-neutral-400"
                  title={t.description}
                >
                  {t.description}
                </td>
                <td className="px-3 py-2">
                  {!t.is_active && <span className={badgeClass}>inactive</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={toggleActive.isPending}
                    onClick={() => toggleActive.mutate(t)}
                  >
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${cardClass} h-fit p-4`}>
        <h3 className="text-sm font-semibold">New content type</h3>
        <div className="mt-3 space-y-2.5">
          <div>
            <label className={labelClass}>Code</label>
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="article, lesson, policy…"
            />
          </div>
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Article, Lesson, Policy…"
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} min-h-[4rem]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`w-full ${primaryButtonClass}`}
            disabled={!code.trim() || !name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create content type"}
          </button>
          {create.isError && (
            <p className={errorTextClass}>
              {errorMessage(create.error, "Couldn't create the content type.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
