import { z } from "zod";
import { generateId } from "./id";

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
  content: z.string().max(5_000_000).catch(""), // Limit size to 5MB characters to prevent DoS
  parentId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  order: z.number().optional().catch(0),
  metadata: PuuNodeMetadataSchema.optional(),
});

export const PuuNodesArraySchema = z
  .array(PuuNodeSchema)
  .max(
    50_000,
    "Maximum of 50,000 nodes allowed in a single document to ensure stability.",
  );

export interface NodeValidationReport {
  errors: string[];
  warnings: string[];
  repaired: boolean;
  inputCount: number;
  outputCount: number;
}

export const validateNodesWithReport = (
  data: unknown,
): { nodes: z.infer<typeof PuuNodeSchema>[]; report: NodeValidationReport } => {
  const report: NodeValidationReport = {
    errors: [],
    warnings: [],
    repaired: false,
    inputCount: Array.isArray(data) ? data.length : 0,
    outputCount: 0,
  };

  if (!Array.isArray(data)) {
    report.errors.push("Node data is not an array.");
    return { nodes: [], report };
  }

  const rawNodes = data.slice(0, 50_000);
  if (data.length > rawNodes.length) {
    report.repaired = true;
    report.warnings.push(
      "Document exceeded 50,000 nodes; extra nodes were ignored.",
    );
  }

  const parsedNodes: z.infer<typeof PuuNodeSchema>[] = [];
  rawNodes.forEach((rawNode, index) => {
    const result = PuuNodeSchema.safeParse(rawNode);
    if (result.success) {
      parsedNodes.push(result.data);
    } else {
      report.repaired = true;
      report.errors.push(`Skipped invalid node at index ${index}.`);
    }
  });

  const seenIds = new Set<string>();
  const validNodes = parsedNodes.map((node, index) => {
    if (!seenIds.has(node.id)) {
      seenIds.add(node.id);
      return node;
    }

    let nextId = generateId();
    while (seenIds.has(nextId)) {
      nextId = generateId();
    }
    seenIds.add(nextId);
    report.repaired = true;
    report.warnings.push(
      `Duplicate node id "${node.id}" at index ${index} was regenerated as "${nextId}".`,
    );

    return { ...node, id: nextId };
  });

  const nodeMap = new Map<string, z.infer<typeof PuuNodeSchema>>();
  for (const node of validNodes) {
    if (nodeMap.has(node.id)) {
      report.repaired = true;
      report.warnings.push(`Duplicate node id "${node.id}" was skipped.`);
      continue;
    }
    nodeMap.set(node.id, node);
  }

  let repairedNodes = Array.from(nodeMap.values());

  const repairParent = (nodeId: string, reason: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.parentId === null) return;
    const repaired = { ...node, parentId: null };
    nodeMap.set(nodeId, repaired);
    report.repaired = true;
    report.warnings.push(`${reason}; node "${nodeId}" was moved to root.`);
  };

  for (const node of repairedNodes) {
    if (node.parentId && !nodeMap.has(node.parentId)) {
      repairParent(node.id, `Missing parent "${node.parentId}"`);
    }
  }

  const hasUnsafeAncestry = (nodeId: string) => {
    const visited = new Set<string>();
    let currentId: string | null = nodeId;
    let depth = 0;

    while (currentId) {
      if (visited.has(currentId)) return "Cycle detected";
      if (depth > 200) return "Max tree depth exceeded";
      visited.add(currentId);
      currentId = nodeMap.get(currentId)?.parentId ?? null;
      depth++;
    }

    return null;
  };

  repairedNodes = Array.from(nodeMap.values());
  for (const node of repairedNodes) {
    const unsafeReason = hasUnsafeAncestry(node.id);
    if (unsafeReason) {
      repairParent(node.id, unsafeReason);
    }
  }

  repairedNodes = Array.from(nodeMap.values());
  report.outputCount = repairedNodes.length;

  return { nodes: repairedNodes, report };
};

export const validateNodes = (data: unknown) =>
  validateNodesWithReport(data).nodes;
