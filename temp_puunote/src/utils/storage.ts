export const isQuotaError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.name === "QuotaExceededError" || err.message.includes("Quota"));
