import { z } from "zod";

export const PuuNodeSchema = z.object({
  id: z.string().min(1).max(256),
  content: z.string().max(5_000_000), // Limit size to 5MB characters to prevent DoS
  parentId: z.string().nullable(),
  order: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const PuuNodesArraySchema = z
  .array(PuuNodeSchema)
  .max(
    50_000,
    "Maximum of 50,000 nodes allowed in a single document to ensure stability.",
  );

export const validateNodes = (data: unknown) => {
  try {
    const nodes = PuuNodesArraySchema.parse(data);

    // Additional validation for tree integrity (cycle prevention and depth validation)
    const nodeMap = new Map();
    for (const node of nodes) {
      if (nodeMap.has(node.id)) {
        console.warn("Duplicate node ID detected, keeping last occurrence:", node.id);
      }
      nodeMap.set(node.id, node);
    }

    let validNodes = Array.from(nodeMap.values()) as typeof nodes;

    for (const node of validNodes) {
      const path = new Set<string>();
      let curr = node.id;
      let depth = 0;
      while (curr) {
        if (path.has(curr)) {
          console.error("Cycle detected at node", curr);
          return []; // Invalid tree shape
        }
        path.add(curr);
        depth++;
        if (depth > 200) {
          console.error("Max tree depth exceeded");
          return [];
        }

        const nextNode = nodeMap.get(curr);
        curr = nextNode?.parentId || null;
      }
    }

    // Optional: Normalize missing parent to null to prevent orphans disappearing completely
    validNodes = validNodes.map((n) => {
      if (n.parentId && !nodeMap.has(n.parentId)) {
        return { ...n, parentId: null };
      }
      return n;
    });

    return validNodes;
  } catch (e) {
    console.error("Invalid node data", e);
    return [];
  }
};
