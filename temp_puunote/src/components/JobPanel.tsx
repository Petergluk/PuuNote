import { X, RotateCcw } from "lucide-react";
import { JobRunner } from "../domain/jobRunner";
import { Job, useJobStore } from "../store/useJobStore";

const statusClass: Record<Job["status"], string> = {
  pending: "text-app-text-muted",
  running: "text-app-accent",
  completed: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-app-text-muted",
};

export function JobPanel() {
  const jobs = useJobStore((s) => s.jobs);
  const clearCompleted = useJobStore((s) => s.clearCompleted);

  if (jobs.length === 0) return null;

  const hasFinished = jobs.some(
    (job) =>
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled",
  );

  return (
    <div className="fixed right-4 bottom-14 z-[90] w-[min(360px,calc(100vw-2rem))] rounded border border-app-border bg-app-panel shadow-xl">
      <div className="flex items-center justify-between border-b border-app-border px-3 py-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-app-text-muted">
          Jobs
        </span>
        {hasFinished && (
          <button
            onClick={clearCompleted}
            className="p-1 text-app-text-muted hover:text-app-text-primary"
            title="Clear finished jobs"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {jobs.map((job) => {
          const progress = Math.max(0, Math.min(100, job.progress ?? 0));
          const canCancel =
            job.status === "pending" || job.status === "running";
          return (
            <div
              key={job.id}
              className="border-b border-app-border/60 px-3 py-2 last:border-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-app-text-primary">
                    {job.name}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] uppercase tracking-wider ${statusClass[job.status]}`}
                  >
                    {job.message || job.status}
                  </div>
                  {job.error && (
                    <div className="mt-1 truncate text-xs text-red-500">
                      {job.error}
                    </div>
                  )}
                </div>
                {canCancel && (
                  <button
                    onClick={() => JobRunner.cancelJob(job.id)}
                    className="shrink-0 rounded p-1 text-app-text-muted hover:bg-app-card-hover hover:text-red-500"
                    title="Cancel job"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded bg-app-card">
                <div
                  className="h-full bg-app-accent transition-all"
                  style={{
                    width: `${job.status === "completed" ? 100 : progress}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
