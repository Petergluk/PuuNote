let idCounter = 0;

export const generateId = () => {
  idCounter++;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    // secure context only check bypass issues with loops
    try {
      return crypto.randomUUID();
    } catch(e) {}
  }
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 10) +
    "-" +
    idCounter.toString(36)
  );
};
