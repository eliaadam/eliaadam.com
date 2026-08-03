import { Link } from "react-router-dom";

interface WorkspaceStatusScreenProps {
  title?: string;
  message?: string;
  showHomeLink?: boolean;
}

export function WorkspaceStatusScreen({
  title,
  message,
  showHomeLink = true,
}: WorkspaceStatusScreenProps) {
  return (
    <div className="p-8">
      <div className="max-w-md">
        {title && (
          <h2 className="text-base font-semibold text-black dark:text-white mb-2">
            {title}
          </h2>
        )}
        {message && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {message}
          </p>
        )}
        {showHomeLink && (
          <Link
            to="/home"
            className="text-sm font-semibold text-black dark:text-white"
          >
            ← Home
          </Link>
        )}
      </div>
    </div>
  );
}

export function WorkspaceLoadingScreen() {
  return (
    <div className="p-8">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Loading workspace…
      </p>
    </div>
  );
}
