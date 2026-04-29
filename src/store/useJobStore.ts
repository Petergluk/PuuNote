import { create } from "zustand";
import { generateId } from "../utils/id";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  progress?: number; // 0-100
  message?: string;
  error?: string;
  createdAt: number;
}

interface JobStore {
  jobs: Job[];
  addJob: (name: string) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  
  addJob: (name: string) => {
    const id = generateId();
    set((state) => ({
      jobs: [
        ...state.jobs,
        { id, name, status: "pending", createdAt: Date.now() },
      ],
    }));
    return id;
  },

  updateJob: (id: string, updates: Partial<Job>) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      ),
    }));
  },

  removeJob: (id: string) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status !== "completed" && job.status !== "failed"
      ),
    }));
  },
}));
