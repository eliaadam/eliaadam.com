import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { sdk, type ContainerKind } from "../../../lib/sdk";

export function ContainerKinds() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  // No list/get-by-code endpoint exists yet (see container.ts's own
  // note on createKind) — kinds created this session are tracked here
  // purely so the admin sees what they just made; this is NOT the
  // source of truth and resets on refresh.
  const [created, setCreated] = useState<ContainerKind[]>([]);

  const mutation = useMutation({
    mutationFn: () => sdk.container.createKind({ code, name }),
    onSuccess: (kind) => {
      setCreated((prev) => [kind, ...prev]);
      setCode("");
      setName("");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Container kinds</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Categories a container can be — e.g. "organization", "department". Used
        by hierarchy templates to decide what each node in a tree is.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm font-medium">
            Code
          </label>
          <input
            id="code"
            type="text"
            required
            placeholder="organization"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Lowercase letters, digits, underscores — starts with a letter.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="Organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't create that kind — check the code is unique and try again.
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="self-start rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Creating…" : "Create kind"}
        </button>
      </form>

      {created.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-500">
            Created this session
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {created.map((kind) => (
              <li
                key={kind.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium">{kind.name}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-500">
                  {kind.code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
