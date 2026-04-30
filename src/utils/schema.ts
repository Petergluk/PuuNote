import { z } from "zod";

export const PuuNodeMetadataSchema = z
  .object({
    isGenerating: z.boolean().optional(),
    ai: z
      .object({
        provider: z.string().optional(),
        jobId: z.string().optional(),
        generatedAt: z.string().optional(),
        operation: z.string().optional(),
      })
      .optional(),
    plugin: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

export const PuuNodeSchema = z.object({
  id: z.string().min(1).max(256),
  content: z.string().max(5_000_000), // Limit size to 5MB characters to prevent DoS
  parentId: z.string().nullable(),
  order: z.number().optional(),
  metadata: PuuNodeMetadataSchema.optional(),
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
        console.warn(
          "Duplicate node ID detected, keeping last occurrence:",
          node.id,
        );
      }
      nodeMap.set(node.id, node);
    }

    let validNodes = Array.from(nodeMap.values()) as typeof nodes;

    const depthCache = new Map<string, number>();
    const getDepth = (nodeId: string, visiting = new Set<string>()): number => {
      const cached = depthCache.get(nodeId);
      if (cached !== undefined) return cached;

      if (visiting.has(nodeId)) {
        throw new Error(`Cycle detected at node ${nodeId}`);
      }

      const node = nodeMap.get(nodeId);
      if (!node?.parentId || !nodeMap.has(node.parentId)) {
        depthCache.set(nodeId, 1);
        return 1;
      }

      visiting.add(nodeId);
      const depth = getDepth(node.parentId, visiting) + 1;
      visiting.delete(nodeId);

      if (depth > 200) {
        throw new Error("Max tree depth exceeded");
      }

      depthCache.set(nodeId, depth);
      return depth;
    };

    try {
      for (const node of validNodes) {
        getDepth(node.id);
      }
    } catch (err) {
      console.error(err);
      return [];
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
