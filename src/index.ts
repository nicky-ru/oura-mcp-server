// Helper function to check if a string is a GUID/UUID
function isGuid(str: string): boolean {
  if (!str) return false;
  
  // GUID/UUID pattern: 8-4-4-4-12 hexadecimal digits
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidPattern.test(str);
}

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { prompts } from "./prompts";
import { ouraFetchTool } from "./tools";
import { OuraService } from "./OuraService";
import type { EnhancedTag, TagApiResponse } from "./interfaces";


// Create MCP Server
async function main() {
  // Get token from environment variable
  const ouraToken = process.env.OURA_TOKEN;

  if (!ouraToken) {
    console.error("OURA_TOKEN environment variable must be set");
    process.exit(1);
  }

  // Initialize Oura service
  const ouraService = new OuraService(ouraToken);

  // Create and configure the server
  const server = new Server({
    name: "oura-mcp-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        ouraFetchTool,
      },
    },
  });

  // Handle list prompts request
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    return {
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
      })),
    };
  });

  // Handle get prompt request
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { params } = request;
    const { id } = params;

    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    return {
      prompt,
    };
  });

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return {
      tools: [ouraFetchTool],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { params } = request;
    const { name, arguments: parameters = {} } = params;

    try {
      // Handle Oura fetch operations
      if (name === "oura-fetch") {
        const endpoint = parameters.endpoint as string;
        const startDate = parameters.startDate as string;
        const endDate = parameters.endDate as string;
        const startDateTime = parameters.startDateTime as string;
        const endDateTime = parameters.endDateTime as string;
        const sleepPeriod = parameters.sleepPeriod as boolean;
        const tagName = parameters.tagName as string;

        let result: any;
        switch (endpoint) {
          case "activity":
            result = await ouraService.getDailyActivity(startDate, endDate);
            break;
          case "readiness":
            result = await ouraService.getDailyReadiness(startDate, endDate);
            break;
          case "sleep":
            result = await ouraService.getDailySleep(startDate, endDate);
            break;
          case "stress":
            result = await ouraService.getDailyStress(startDate, endDate);
            break;
          case "heartrate":
            result = await ouraService.getHeartRate(startDateTime, endDateTime);
            // If sleepPeriod is true, also fetch sleep data and include that
            if (sleepPeriod && startDate && endDate) {
              const sleepData = await ouraService.getSleep(startDate, endDate);
              result = {
                heartRate: result,
                sleepData: sleepData,
                note: "Heart rate data and sleep data are both provided so you can analyze heart rate during sleep periods.",
              };
            }
            break;
          case "sleep_sessions":
            result = await ouraService.getSleep(startDate, endDate);
            break;
          case "tags":
            // Fetch tags
            const tagsResult = await ouraService.getTags(startDate, endDate);
            
            // Convert to our extended interface
            result = {
              ...tagsResult
            } as TagApiResponse;
            
            // Filter out custom tags (GUID) with empty comments
            if (result.data) {
                result.data = result.data.filter((tag: EnhancedTag) => {
                // Keep the tag if:
                // 1. It's a standard tag (tag_type_code is not a GUID), or
                // 2. It's a custom tag (tag_type_code is a GUID) but has a non-empty comment
                return !isGuid(tag.tag_type_code) || 
                     (isGuid(tag.tag_type_code) && tag.comment && tag.comment.trim() !== '');
                });
              
              // Add metadata to help Claude understand the tag structure
              result.tagMetadata = {
                standardTags: result.data.filter((tag:EnhancedTag) => !isGuid(tag.tag_type_code)).length,
                customTags: result.data.filter((tag:EnhancedTag) => isGuid(tag.tag_type_code)).length,
                note: "Custom tags (with GUID tag_type_code) represent user-defined entries, often containing meal information. Standard tags have descriptive tag_type_code values like 'tag_generic_supplements'."
              };
            }
            
            // Filter by tag name if provided
            if (tagName && result.data) {
              result.data = result.data.filter(
                (tag:EnhancedTag) =>
                  tag.custom_name
                    ?.toLowerCase()
                    .includes(tagName.toLowerCase()) ||
                  tag.comment?.toLowerCase().includes(tagName.toLowerCase())
              );
            }
            break;
          default:
            throw new Error(`Unsupported endpoint: ${endpoint}`);
        }

        // Return JSON data only
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
          isError: false,
        };
      }

      throw new Error(`Unsupported tool: ${name}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error executing tool:", errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: errorMessage }),
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});