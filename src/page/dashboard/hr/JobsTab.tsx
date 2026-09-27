import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus } from "lucide-react";
import type { Job, JobStatus } from "../../../lib/sdk/domains/hr";
import { sdk } from "../../../lib/sdk";
 
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

function statusClasses(status: JobStatus): string {
  return status === "active"
    ? "bg-black text-white dark:bg-white dark:text-black"
    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export function JobsTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["hr", "jobs", containerId],
    queryFn: () => sdk.hr.listJobsForContainer(containerId),
  });

  const { data: vacantPositions } = useQuery({
    queryKey: ["hr", "positions", "vacant", containerId],
    queryFn: () => sdk.hr.listVacantPositions(containerId),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Jobs</p>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={`flex items-center gap-1 ${primaryButtonClass}`}
          >
            <Plus size={13} />
            {showCreate ? "Close" : "New job"}
          </button>
        </div>

        {showCreate && <CreateJobForm containerId={containerId} onDone={() => setShowCreate(false)} />}

        {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

        {jobs && jobs.length === 0 && !showCreate && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <Briefcase className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No jobs defined yet.</p>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} containerId={containerId} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Vacant positions</p>
        {vacantPositions && vacantPositions.length === 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500">No vacant positions.</p>
        )}
        {vacantPositions && vacantPositions.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {vacantPositions.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Position {p.id.slice(0, 8)} · headcount {p.headcount}
                  {p.cost_center_code && ` · ${p.cost_center_code}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JobRow({ job, containerId }: { job: Job; containerId: string }) {
  const queryClient = useQueryClient();
  const [showPositionForm, setShowPositionForm] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hr", "jobs", containerId] });
  const archiveMutation = useMutation({ mutationFn: () => sdk.hr.archiveJob(job.id), onSuccess: invalidate });
  const reactivateMutation = useMutation({ mutationFn: () => sdk.hr.reactivateJob(job.id), onSuccess: invalidate });

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{job.title}</p>
            <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(job.status)}`}>
              {job.status}
            </span>
          </div>
          {job.job_family && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">{job.job_family}{job.level && ` · ${job.level}`}</p>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={() => setShowPositionForm((v) => !v)} className={secondaryButtonClass}>
            {showPositionForm ? "Cancel" : "Add position"}
          </button>
          {job.status === "active" ? (
            <button type="button" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
              Archive
            </button>
          ) : (
            <button type="button" onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending} className={secondaryButtonClass}>
              Reactivate
            </button>
          )}
        </div>
      </div>
      {showPositionForm && (
        <CreatePositionForm containerId={containerId} jobId={job.id} onDone={() => setShowPositionForm(false)} />
      )}
    </li>
  );
}

function CreatePositionForm({ containerId, jobId, onDone }: { containerId: string; jobId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [departmentContainerId, setDepartmentContainerId] = useState("");
  const [headcount, setHeadcount] = useState("1");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createPosition(containerId, {
        job_id: jobId,
        department_container_id: departmentContainerId,
        headcount: Number(headcount) || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "positions", "vacant", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
      <input
        className={`${inputClass} text-xs`}
        placeholder="Department container id…"
        value={departmentContainerId}
        onChange={(e) => setDepartmentContainerId(e.target.value)}
      />
      <input
        type="number"
        min="1"
        className={`${inputClass} max-w-[6rem] text-xs`}
        value={headcount}
        onChange={(e) => setHeadcount(e.target.value)}
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!departmentContainerId.trim() || mutation.isPending}
        className={secondaryButtonClass}
      >
        Add
      </button>
    </div>
  );
}

function CreateJobForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobFamily, setJobFamily] = useState("");
  const [level, setLevel] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createJob(containerId, {
        title,
        description: description || undefined,
        job_family: jobFamily || undefined,
        level: level || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "jobs", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Title</label>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Description</label>
        <textarea className={`${inputClass} min-h-[3rem]`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Job family</label>
          <input className={inputClass} value={jobFamily} onChange={(e) => setJobFamily(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Level</label>
          <input className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending} className={primaryButtonClass}>
          {mutation.isPending ? "Creating…" : "Create job"}
        </button>
        <button type="button" onClick={onDone} className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white">
          Cancel
        </button>
        {mutation.isError && <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this job.</p>}
      </div>
    </div>
  );
}
