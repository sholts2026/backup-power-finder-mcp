import { recommend } from "./apps.js";

const recommendationOutputSchema = {
  type: "object",
  properties: {
    appId: { type: "string" },
    displayName: { type: "string" },
    intent: { type: "object", additionalProperties: true },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          name: { type: "string" },
          merchant: { type: "string" },
          price: { type: "number" },
          score: { type: "number" },
          reasons: { type: "array", items: { type: "string" } },
          runtime: { type: ["object", "null"], additionalProperties: true },
          buyUrl: { type: "string" },
          redirectPath: { type: "string" },
          affiliateDisclosure: { type: "string" }
        }
      }
    },
    nextQuestions: { type: "array", items: { type: "string" } }
  }
};

const readOnlyAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
  destructiveHint: false
};

const toolDefinitions = [
  {
    name: "recommend_pet_food",
    title: "Recommend dog food",
    description: "Recommend dog food by allergies, life stage, breed size, stomach sensitivity, picky eating, and monthly budget.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        budget: { type: "number", minimum: 1 },
        limit: { type: "integer", minimum: 1, maximum: 5 },
        lifeStage: { type: "string", enum: ["puppy", "adult", "senior"] },
        breedSize: { type: "string", enum: ["small", "medium", "large"] },
        avoidProteins: { type: "array", items: { type: "string" } },
        goals: {
          type: "array",
          items: {
            type: "string",
            enum: ["sensitive_stomach", "picky_eater", "weight_management", "fresh", "budget"]
          }
        }
      },
      required: ["query"],
      additionalProperties: false
    },
    outputSchema: recommendationOutputSchema,
    annotations: readOnlyAnnotations
  },
  {
    name: "recommend_mattress",
    title: "Recommend mattresses",
    description: "Recommend mattresses by sleep position, heat, firmness, partner needs, size, trial, and budget.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        budget: { type: "number", minimum: 1 },
        limit: { type: "integer", minimum: 1, maximum: 5 }
      },
      required: ["query"],
      additionalProperties: false
    },
    outputSchema: recommendationOutputSchema,
    annotations: readOnlyAnnotations
  },
  {
    name: "recommend_backup_power",
    title: "Find backup power stations",
    description: "Compare portable battery power stations for outages, apartments, camping, and RV use by device load, runtime, solar charging, portability, and budget. Returns modeled estimates, tradeoffs, safety notes, and disclosed shopping links.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, description: "The shopper's full backup-power request." },
        budget: { type: "number", minimum: 1, description: "Maximum purchase budget in US dollars." },
        limit: { type: "integer", minimum: 1, maximum: 5, description: "Number of recommendations to return." },
        useCase: { type: "string", enum: ["home_backup", "apartment", "camping", "rv"] },
        desiredHours: { type: "number", minimum: 0.5, maximum: 168 },
        loadWatts: { type: "number", minimum: 1, maximum: 10000 },
        devices: {
          type: "array",
          uniqueItems: true,
          items: { type: "string", enum: ["fridge", "cpap", "router", "microwave"] }
        },
        wantsSolar: { type: "boolean" },
        portabilityPriority: { type: "boolean" },
        quietIndoorPriority: { type: "boolean" }
      },
      required: ["query"],
      additionalProperties: false
    },
    outputSchema: recommendationOutputSchema,
    annotations: readOnlyAnnotations
  }
];

function isToolAllowed(name) {
  if (process.env.PUBLISHED_APP === "pet-food-finder") return name === "recommend_pet_food";
  if (process.env.PUBLISHED_APP === "mattress-finder") return name === "recommend_mattress";
  if (process.env.PUBLISHED_APP === "backup-power-finder") return name === "recommend_backup_power";
  return true;
}

function allowedTools() {
  return toolDefinitions.filter((tool) => isToolAllowed(tool.name));
}

export function handleMcpRequest(message) {
  if (Array.isArray(message)) {
    return message.filter((item) => item.id !== undefined).map((item) => handleMcpRequest(item));
  }

  if (!message?.method) {
    return {
      jsonrpc: "2.0",
      id: message?.id ?? null,
      error: { code: -32600, message: "Invalid request" }
    };
  }

  if (message.id === undefined) return null;

  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: process.env.PUBLISHED_APP ?? "commerce-finder", version: "1.0.0" },
        instructions: "Provide fit-first product comparisons, label runtime as an estimate, disclose affiliate relationships, and direct safety-critical questions to manufacturers or qualified professionals."
      }
    };
  }

  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: allowedTools() } };
  }

  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params ?? {};
    if (!isToolAllowed(name)) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: `Tool is not available in this published app: ${name}` }
      };
    }

    const appId = name === "recommend_pet_food"
      ? "pet-food-finder"
      : name === "recommend_mattress"
        ? "mattress-finder"
        : name === "recommend_backup_power"
          ? "backup-power-finder"
          : null;

    if (!appId) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: `Unknown tool: ${name}` }
      };
    }

    const result = recommend(appId, args);
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      }
    };
  }

  return {
    jsonrpc: "2.0",
    id: message.id ?? null,
    error: { code: -32601, message: `Unknown method: ${message.method}` }
  };
}
