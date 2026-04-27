let idCounter = 0;

export const generateId = () => {
  idCounter++;
  return (
    crypto.randomUUID?.() ||
    Date.now().toString(36) +
      Math.random().toString(36).substring(2, 9) +
      idCounter.toString(36)
  );
};
