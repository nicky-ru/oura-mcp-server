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
  Prompt,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";
import {
  OuraApiResponse,
  DailyActivity,
  DailyReadiness,
  DailySleep,
  DailyStress,
  SleepSession,
  HeartRate,
  EnhancedTag,
  TagApiResponse
} from "./interfaces.js";
import { prompts } from "./prompts.js";

// Oura Tool definitions - simplified
const ouraFetchTool: Tool = {
  name: "oura-fetch",
  description: "Fetch data from Oura Ring API endpoints",
  inputSchema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        enum: [
          "activity",
          "readiness",
          "sleep",
          "stress",
          "heartrate",
          "sleep_sessions",
          "tags",
        ],
        description: "The Oura API endpoint to fetch data from",
      },
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
      startDateTime: {
        type: "string",
        description:
          "Start datetime in ISO format with timezone (for heartrate endpoint)",
      },
      endDateTime: {
        type: "string",
        description:
          "End datetime in ISO format with timezone (for heartrate endpoint)",
      },
      sleepPeriod: {
        type: "boolean",
        description:
          "Whether to filter heart rate data to sleep periods only (requires additional sleep data fetch)",
      },
      tagName: {
        type: "string",
        description: "Optional filter for specific tag name or keyword in comment",
      },
    },
    required: ["endpoint"],
  },
};

// Oura service class
class OuraService {
  private token: string;
  private baseUrl: string = "https://api.ouraring.com/v2/usercollection";

  constructor(token: string) {
    this.token = token;
  }

  private async fetchData<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<OuraApiResponse<T>> {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${this.token}`);

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
    };

    try {
      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${
            response.status
          }: ${await response.text()}`
        );
      }

      return (await response.json()) as OuraApiResponse<T>;
    } catch (error) {
      console.error("Error fetching data from Oura API:", error);
      throw error;
    }
  }

  async getDailyActivity(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyActivity>> {
    return this.fetchData<DailyActivity>("daily_activity", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailyReadiness(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyReadiness>> {
    return this.fetchData<DailyReadiness>("daily_readiness", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailySleep(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailySleep>> {
    return this.fetchData<DailySleep>("daily_sleep", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailyStress(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyStress>> {
    return this.fetchData<DailyStress>("daily_stress", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getHeartRate(
    startDateTime: string,
    endDateTime: string
  ): Promise<OuraApiResponse<HeartRate>> {
    return this.fetchData<HeartRate>("heartrate", {
      start_datetime: startDateTime,
      end_datetime: endDateTime,
    });
  }

  async getTags(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<EnhancedTag>> {
    return this.fetchData<EnhancedTag>("enhanced_tag", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getSleep(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<SleepSession>> {
    return this.fetchData<SleepSession>("sleep", {
      start_date: startDate,
      end_date: endDate,
    });
  }
}

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