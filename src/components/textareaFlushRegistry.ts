type PendingTextareaFlush = () => void;

const pendingTextareaFlushers = new Set<PendingTextareaFlush>();

export const registerPendingTextareaFlush = (flush: PendingTextareaFlush) => {
  pendingTextareaFlushers.add(flush);
  return () => pendingTextareaFlushers.delete(flush);
};

export const flushPendingTextareas = () => {
  pendingTextareaFlushers.forEach((flush) => flush());
};
