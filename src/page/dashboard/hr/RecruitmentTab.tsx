import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Users2 } from "lucide-react";
import type {
  ApplicationStatus,
  JobOpening,
} from "../../../lib/sdk/domains/hr";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

const NEXT_STAGE: Record<ApplicationStatus, ApplicationStatus | null> = {
  applied: "screening",
  screening: "interviewing",
  interviewing: "assessment",
  assessment: "offer",
  offer: "hired",
  hired: null,
  rejected: null,
  withdrawn: null,
};

function statusClasses(status: JobOpening["status"]): string {
  if (status === "filled")
    return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "closed")
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (status === "on_hold")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"; // open
}

export function RecruitmentTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: openings, isLoading } = useQuery({
    queryKey: ["hr", "job-openings", containerId],
    queryFn: () => sdk.hr.listJobOpeningsForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Job openings</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New opening"}
        </button>
      </div>

      {showCreate && (
        <CreateOpeningForm
          containerId={containerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {openings && openings.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Users2
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No job openings yet.
          </p>
        </div>
      )}

      {openings && openings.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {openings.map((o) => (
            <OpeningRow key={o.id} opening={o} containerId={containerId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OpeningRow({
  opening,
  containerId,
}: {
  opening: JobOpening;
  containerId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["hr", "job-openings", containerId],
    });

  const holdMutation = useMutation({
    mutationFn: () => sdk.hr.putJobOpeningOnHold(opening.id),
    onSuccess: invalidate,
  });
  const reopenMutation = useMutation({
    mutationFn: () => sdk.hr.reopenJobOpening(opening.id),
    onSuccess: invalidate,
  });
  const closeMutation = useMutation({
    mutationFn: () => sdk.hr.closeJobOpening(opening.id),
    onSuccess: invalidate,
  });

  const { data: applications } = useQuery({
    queryKey: ["hr", "applications", opening.id],
    queryFn: () => sdk.hr.listApplicationsForOpening(opening.id),
    enabled: expanded,
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div
        className="flex cursor-pointer items-center justify-between gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="flex-none text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="flex-none text-neutral-400" />
          )}
          <p className="truncate text-sm font-medium">{opening.title}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(opening.status)}`}
          >
            {opening.status.replace("_", " ")}
          </span>
        </div>
        <div
          className="flex flex-none items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {opening.status === "open" && (
            <button
              type="button"
              onClick={() => holdMutation.mutate()}
              disabled={holdMutation.isPending}
              className={secondaryButtonClass}
            >
              Hold
            </button>
          )}
          {opening.status === "on_hold" && (
            <button
              type="button"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
              className={secondaryButtonClass}
            >
              Reopen
            </button>
          )}
          {(opening.status === "open" || opening.status === "on_hold") && (
            <button
              type="button"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-l border-neutral-200 pl-4 dark:border-neutral-800">
          <AddApplicationForm
            jobOpeningId={opening.id}
            containerId={containerId}
          />
          {applications && applications.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              No applications yet.
            </p>
          )}
          {applications && applications.length > 0 && (
            <ul className="flex flex-col gap-2">
              {applications.map((a) => (
                <ApplicationRow
                  key={a.id}
                  application={a}
                  jobOpeningId={opening.id}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function ApplicationRow({
  application,
  jobOpeningId,
}: {
  application: { id: string; candidate_id: string; status: ApplicationStatus };
  jobOpeningId: string;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["hr", "applications", jobOpeningId],
    });

  const advanceMutation = useMutation({
    mutationFn: (to: ApplicationStatus) =>
      sdk.hr.advanceApplication(application.id, to),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => sdk.hr.advanceApplication(application.id, "rejected"),
    onSuccess: invalidate,
  });

  const next = NEXT_STAGE[application.status];
  const isTerminal = ["hired", "rejected", "withdrawn"].includes(
    application.status,
  );

  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="truncate text-xs text-neutral-600 dark:text-neutral-400">
        Candidate {application.candidate_id.slice(0, 8)} — {application.status}
      </span>
      {!isTerminal && (
        <div className="flex flex-none items-center gap-2">
          {next && (
            <button
              type="button"
              onClick={() => advanceMutation.mutate(next)}
              disabled={advanceMutation.isPending}
              className={secondaryButtonClass}
            >
              → {next}
            </button>
          )}
          <button
            type="button"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

function AddApplicationForm({
  jobOpeningId,
  containerId,
}: {
  jobOpeningId: string;
  containerId: string;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const candidate = await sdk.hr.createCandidate(containerId, {
        full_name: fullName,
        email,
      });
      return sdk.hr.createApplication(jobOpeningId, candidate.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "applications", jobOpeningId],
      });
      setFullName("");
      setEmail("");
      setShowForm(false);
    },
  });

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className={`w-fit ${secondaryButtonClass}`}
      >
        + Add candidate
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className={`${inputClass} text-xs`}
        placeholder="Full name…"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <input
        className={`${inputClass} text-xs`}
        placeholder="Email…"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!fullName.trim() || !email.trim() || mutation.isPending}
        className={`flex-none ${secondaryButtonClass}`}
      >
        Add
      </button>
    </div>
  );
}

function CreateOpeningForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [positionId, setPositionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createJobOpening(containerId, {
        position_id: positionId,
        title,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "job-openings", containerId],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Position id
        </label>
        <input
          className={inputClass}
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Title
        </label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!positionId.trim() || !title.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create opening"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't create this opening.
          </p>
        )}
      </div>
    </div>
  );
}
