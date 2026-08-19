import { useAuth } from "../../hooks/useAuth";

export default function AdminOverviewPage() {
  const { actor } = useAuth();

  return (
    <div className="p-8 max-w-[960px]">
      <header className="mb-8">
        <h1 className="text-neutral-500 dark:text-neutral-400 mt-1">
          Welcome back, {actor?.display_name ?? "Admin"}
        </h1>
        <p text-neutral-500 dark:text-neutral-400 mt-1>
          Use navigation to explore available options.
        </p>
      </header>
    </div>
  );
}
