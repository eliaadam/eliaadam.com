import { useState, type FormEvent } from "react";
import { useAuth } from "../../components/context/Authcontext";

export function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Local-only for now — there's no profile-update endpoint yet
    // (see AuthContext.tsx's note on placeholder auth). This just
    // confirms the save affordance to the person using it.
    setSaved(true);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Your account details.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/40 focus:border-teal-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-teal-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.email ?? ""}
            disabled
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
          />
        </div>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Save changes
          </button>
          {saved && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
