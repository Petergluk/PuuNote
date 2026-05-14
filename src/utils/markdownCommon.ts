export const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, "\n");

export const trimBlankEdges = (lines: string[]) => {
  const next = [...lines];
  while (next.length > 0 && next[0].trim() === "") next.shift();
  while (next.length > 0 && next[next.length - 1].trim() === "") next.pop();
  return next;
};
