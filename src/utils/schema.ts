import { z } from "zod";

export const PuuNodeSchema = z.object({
  id: z.string().min(1).max(256),
  content: z.string().max(5_000_000), // Limit size to 5MB characters to prevent DoS
  parentId: z.string().nullable(),
  order: z.number().optional(),
});

export const PuuNodesArraySchema = z.array(PuuNodeSchema);

export const validateNodes = (data: unknown) => {
  try {
    return PuuNodesArraySchema.parse(data);
  } catch (e) {
    console.error("Invalid node data", e);
    return [];
  }
};
