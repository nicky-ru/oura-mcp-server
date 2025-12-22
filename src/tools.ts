import { Tool } from "@modelcontextprotocol/sdk/types";

// Oura Tool definitions - simplified
export const ouraFetchTool: Tool = {
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