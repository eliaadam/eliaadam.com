import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { sdk } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

const STATUS_STYLES: Record<string, string> = {
  draft:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  published: "bg-black text-white dark:bg-white dark:text-black",
  closed:
    "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400",
  archived:
    "border border-dashed border-neutral-400 text-neutral-500 dark:border-neutral-600",
};

export function Forms() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: forms, isLoading } = useQuery({
    queryKey: ["form", "list", currentContainerId],
    queryFn: () => sdk.form.listForms(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      sdk.form.createForm({
        container_id: currentContainerId!,
        owner_actor_id: user!.id,
        title,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["form", "list", currentContainerId],
      });
      navigate(`/dashboard/form/${created.id}`);
    },
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Forms</h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
        >
          <Plus size={15} />
          New form
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <input
            className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Form title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            Create
          </button>
        </form>
      )}

      <div className="mt-6">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}
        {forms && forms.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <FileText
              className="mx-auto text-neutral-400 dark:text-neutral-600"
              size={22}
            />
            <p className="mt-3 text-sm font-medium">No forms yet</p>
          </div>
        )}
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {forms?.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/form/${f.id}`)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.title}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {f.fields.length} question{f.fields.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[f.status]}`}
                >
                  {f.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
