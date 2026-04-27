export const generateId = () =>
  crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);
