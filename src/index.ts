import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { prompts } from './prompts';
import { OuraService } from './OuraService';
import type { EnhancedTag, TagApiResponse } from './interfaces';

function isGuid(str: string): boolean {
  if (!str) return false;

  // GUID/UUID pattern: 8-4-4-4-12 hexadecimal digits
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidPattern.test(str);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

const dateRange = {
  startDate: z.string(),
  endDate: z.string(),
};

const dateTimeRange = {
  startDateTime: z.string(),
  endDateTime: z.string(),
};

const ouraFetchInputShape = {
  endpoint: z
    .enum([
      'activity',
      'readiness',
      'sleep',
      'stress',
      'heartrate',
      'sleep_sessions',
      'tags',
    ])
    .describe('The Oura API endpoint to fetch data from'),
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
  startDateTime: z
    .string()
    .optional()
    .describe('Start datetime in ISO format with timezone (for heartrate endpoint)'),
  endDateTime: z
    .string()
    .optional()
    .describe('End datetime in ISO format with timezone (for heartrate endpoint)'),
  sleepPeriod: z
    .boolean()
    .optional()
    .describe(
      'Whether to filter heart rate data to sleep periods only (requires additional sleep data fetch)',
    ),
  tagName: z
    .string()
    .optional()
    .describe('Optional filter for specific tag name or keyword in comment'),
} as const;

const ouraFetchValidationSchema = z.union([
  z.object({ endpoint: z.literal('activity'), ...dateRange }).strict(),
  z.object({ endpoint: z.literal('readiness'), ...dateRange }).strict(),
  z.object({ endpoint: z.literal('sleep'), ...dateRange }).strict(),
  z.object({ endpoint: z.literal('stress'), ...dateRange }).strict(),
  z.object({ endpoint: z.literal('sleep_sessions'), ...dateRange }).strict(),
  z
    .object({
      endpoint: z.literal('tags'),
      ...dateRange,
      tagName: z.string().optional(),
    })
    .strict(),
  z
    .object({
      endpoint: z.literal('heartrate'),
      ...dateTimeRange,
      sleepPeriod: z.literal(false).optional(),
    })
    .strict(),
  z
    .object({
      endpoint: z.literal('heartrate'),
      ...dateTimeRange,
      sleepPeriod: z.literal(true),
      ...dateRange,
    })
    .strict(),
]);

// Create MCP Server
async function main() {
  // Get token from environment variable
  const ouraToken = process.env.OURA_TOKEN;

  if (!ouraToken) {
    console.error('OURA_TOKEN environment variable must be set');
    process.exit(1);
  }

  // Initialize Oura service
  const ouraService = new OuraService(ouraToken);

  // Create and configure the server
  const mcp = new McpServer(
    {
      name: 'oura-mcp-server',
      version: '1.0.0',
    },
  );

  for (const prompt of prompts) {
    mcp.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
      },
      () => ({
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt.text,
            },
          },
        ],
      }),
    );
  }

  mcp.registerTool(
    'oura-fetch',
    {
      title: 'Oura Fetch',
      description: 'Fetch data from Oura Ring API endpoints',
      inputSchema: ouraFetchInputShape,
    },
    async (parameters) => {
      const validated = ouraFetchValidationSchema.parse(parameters);
      let result: unknown;
      switch (validated.endpoint) {
        case 'activity':
          result = await ouraService.getDailyActivity(
            validated.startDate,
            validated.endDate,
          );
          break;
        case 'readiness':
          result = await ouraService.getDailyReadiness(
            validated.startDate,
            validated.endDate,
          );
          break;
        case 'sleep':
          result = await ouraService.getDailySleep(
            validated.startDate,
            validated.endDate,
          );
          break;
        case 'stress':
          result = await ouraService.getDailyStress(
            validated.startDate,
            validated.endDate,
          );
          break;
        case 'heartrate':
          result = await ouraService.getHeartRate(
            validated.startDateTime,
            validated.endDateTime,
          );
          // If sleepPeriod is true, also fetch sleep data and include that
          if (validated.sleepPeriod === true) {
            const sleepData = await ouraService.getSleep(
              validated.startDate,
              validated.endDate,
            );
            result = {
              heartRate: result,
              sleepData,
              note: 'Heart rate data and sleep data are both provided so you can analyze heart rate during sleep periods.',
            };
          }
          break;
        case 'sleep_sessions':
          result = await ouraService.getSleep(validated.startDate, validated.endDate);
          break;
        case 'tags': {
          // Fetch tags
          const tagsResult = await ouraService.getTags(
            validated.startDate,
            validated.endDate,
          );

          // Convert to our extended interface
          const tagResponse = {
            ...tagsResult,
          } as TagApiResponse;

          // Filter out custom tags (GUID) with empty comments
          tagResponse.data = tagResponse.data.filter((tag: EnhancedTag) => {
            // Keep the tag if:
            // 1. It's a standard tag (tag_type_code is not a GUID), or
            // 2. It's a custom tag (tag_type_code is a GUID) but has a non-empty comment
            return (
              !isGuid(tag.tag_type_code) ||
              (isGuid(tag.tag_type_code) && tag.comment.trim() !== '')
            );
          });

          // Add metadata to help clients understand the tag structure
          tagResponse.tagMetadata = {
            standardTags: tagResponse.data.filter(
              (tag: EnhancedTag) => !isGuid(tag.tag_type_code),
            ).length,
            customTags: tagResponse.data.filter((tag: EnhancedTag) =>
              isGuid(tag.tag_type_code),
            ).length,
            note: "Custom tags (with GUID tag_type_code) represent user-defined entries, often containing meal information. Standard tags have descriptive tag_type_code values like 'tag_generic_supplements'.",
          };

          // Filter by tag name if provided
          const tagName = validated.tagName;
          if (tagName) {
            tagResponse.data = tagResponse.data.filter(
              (tag: EnhancedTag) =>
                tag.custom_name
                  .toLowerCase()
                  .includes(tagName.toLowerCase()) ||
                tag.comment.toLowerCase().includes(tagName.toLowerCase()),
            );
          }

          result = tagResponse;
          break;
        }
        default:
          return assertNever(validated);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        isError: false,
      };
    },
  );

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error('Server started');
}

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
