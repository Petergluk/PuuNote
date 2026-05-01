import { useJobStore } from "../store/useJobStore";

export type JobFunction<T = unknown> = (
  updateProgress: (progress: number, message?: string) => void,
  checkCancelled: () => void,
  signal: AbortSignal,
) => Promise<T>;

class JobRunnerClass {
  private activeJobs = new Set<string>();
  private cancelledJobs = new Set<string>();
  private abortControllers = new Map<string, AbortController>();

  async runJob<T>(name: string, jobFn: JobFunction<T>): Promise<T | null> {
    const jobId = useJobStore.getState().addJob(name);
    const abortController = new AbortController();
    this.activeJobs.add(jobId);
    this.abortControllers.set(jobId, abortController);
    useJobStore
      .getState()
      .updateJob(jobId, { status: "running", message: "Starting..." });

    const updateProgress = (progress: number, message?: string) => {
      if (this.cancelledJobs.has(jobId)) return;
      useJobStore.getState().updateJob(jobId, { progress, message });
    };

    const checkCancelled = () => {
      if (this.cancelledJobs.has(jobId) || abortController.signal.aborted) {
        throw new Error("Job cancelled");
      }
    };

    try {
      const result = await jobFn(
        updateProgress,
        checkCancelled,
        abortController.signal,
      );
      if (this.cancelledJobs.has(jobId)) throw new Error("Job cancelled");

      useJobStore.getState().updateJob(jobId, {
        status: "completed",
        progress: 100,
        message: "Done",
      });

      // Optionally auto-remove after some time
      setTimeout(() => {
        useJobStore.getState().removeJob(jobId);
      }, 5000);

      return result;
    } catch (err) {
      if (err instanceof Error && err.message === "Job cancelled") {
        useJobStore
          .getState()
          .updateJob(jobId, { status: "cancelled", message: "Cancelled" });
      } else {
        useJobStore.getState().updateJob(jobId, {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          message: "Failed",
        });
      }
      return null;
    } finally {
      this.activeJobs.delete(jobId);
      this.cancelledJobs.delete(jobId);
      this.abortControllers.delete(jobId);
    }
  }

  cancelJob(jobId: string) {
    if (this.activeJobs.has(jobId)) {
      this.cancelledJobs.add(jobId);
      this.abortControllers.get(jobId)?.abort();
      useJobStore
        .getState()
        .updateJob(jobId, { status: "cancelled", message: "Cancelling..." });
    }
  }
}

export const JobRunner = new JobRunnerClass();
