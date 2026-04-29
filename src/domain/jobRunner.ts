import { useJobStore } from "../store/useJobStore";

export type JobFunction<T = any> = (
  updateProgress: (progress: number, message?: string) => void,
  checkCancelled: () => void
) => Promise<T>;

class JobRunnerClass {
  private activeJobs = new Set<string>();
  private cancelledJobs = new Set<string>();

  async runJob<T>(name: string, jobFn: JobFunction<T>): Promise<T | null> {
    const jobId = useJobStore.getState().addJob(name);
    this.activeJobs.add(jobId);
    useJobStore.getState().updateJob(jobId, { status: "running", message: "Starting..." });

    const updateProgress = (progress: number, message?: string) => {
      if (this.cancelledJobs.has(jobId)) return;
      useJobStore.getState().updateJob(jobId, { progress, message });
    };

    const checkCancelled = () => {
      if (this.cancelledJobs.has(jobId)) {
        throw new Error("Job cancelled");
      }
    };

    try {
      const result = await jobFn(updateProgress, checkCancelled);
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
        useJobStore.getState().updateJob(jobId, { status: "failed", message: "Cancelled" });
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
    }
  }

  cancelJob(jobId: string) {
    if (this.activeJobs.has(jobId)) {
      this.cancelledJobs.add(jobId);
    }
  }
}

export const JobRunner = new JobRunnerClass();
