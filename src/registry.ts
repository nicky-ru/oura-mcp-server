import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { isGuid, assertNever } from './helpers';
import { OuraService } from './OuraService';
import { prompts } from './prompts';
import { ouraFetchInputShape, ouraFetchValidationSchema } from './schemas';

import type { EnhancedTag, TagApiResponse } from './interfaces';

export function registerTools(mcp: McpServer) {
  const ouraService = new OuraService();
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
          result = await ouraService.getSleep(
            validated.startDate,
            validated.endDate,
          );
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
                tag.custom_name.toLowerCase().includes(tagName.toLowerCase()) ||
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
}

export function registerPrompts(mcp: McpServer) {
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
}

export function registerResources(mcp: McpServer) {
  mcp.registerResource(
    'oura-guidance',
    'oura://guidance',
    {
      title: 'Oura Data Analysis Guidelines',
      description:
        'Essential guidelines for correctly analyzing Oura Ring data, including unit conversions and calculation rules',
      mimeType: 'text/markdown',
    },
    () => {
      const guidance = `# Oura Data Analysis Guidelines

## Critical Rules for Data Analysis

### 1. Time Units
All duration fields in the Oura API response are in **seconds**. Always convert to hours/minutes for user-friendly conversation.

**Example:**
- API returns: \`total_sleep_duration: 28800\`
- Display as: "8 hours" or "8h 0m"

### 2. Sleep Stage Percentages
**Always calculate sleep stage percentages using \`total_sleep_duration\` as the denominator, NOT \`time_in_bed\`.**

This matches how percentages are displayed in the Oura app.

**Example:**
- \`total_sleep_duration: 28800\` (8 hours)
- \`deep_sleep_duration: 7200\` (2 hours)
- **Correct:** \`(7200 / 28800) * 100 = 25%\`
- **Wrong:** Using \`time_in_bed\` as denominator

### 3. Sleep Efficiency
Sleep efficiency = \`(total_sleep_duration / time_in_bed) * 100\`

**Example:**
- \`total_sleep_duration: 28800\` seconds
- \`time_in_bed: 32400\` seconds
- Efficiency: \`(28800 / 32400) * 100 = 88.9%\`

### 4. Tags
- **Custom tags** (with GUID \`tag_type_code\`) usually contain meal information in the \`comment\` field
- **Standard tags** have descriptive \`tag_type_code\` values like \`tag_generic_supplements\`

### 5. Correlations
When analyzing correlations:
- Ensure data points are properly time-aligned
- Use appropriate time offsets when looking for delayed effects (e.g., evening meal → next day readiness)

### 6. Presentation
Always provide:
- Raw values (with units)
- Calculated percentages/averages
- Clear explanation of which denominator was used for percentage calculations

## Using the oura-fetch Tool

The \`oura-fetch\` tool accepts the following endpoints:

- \`activity\` - Daily activity metrics (requires \`startDate\`, \`endDate\`)
- \`readiness\` - Daily readiness scores (requires \`startDate\`, \`endDate\`)
- \`sleep\` - Daily sleep summaries (requires \`startDate\`, \`endDate\`)
- \`sleep_sessions\` - Detailed sleep session data (requires \`startDate\`, \`endDate\`)
- \`stress\` - Daily stress metrics (requires \`startDate\`, \`endDate\`)
- \`heartrate\` - Heart rate data (requires \`startDateTime\`, \`endDateTime\` in ISO format)
- \`tags\` - User tags and annotations (requires \`startDate\`, \`endDate\`, optional \`tagName\` filter)

**Example:**
\`\`\`json
{
  "endpoint": "sleep",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07"
}
\`\`\`

For heart rate during sleep periods, set \`sleepPeriod: true\` and provide both datetime and date ranges.

DON'T FORGET TO PROVIDE THE START AND END DATES OR DATE TIMES FOR THE REQUEST.
`;

      return {
        contents: [
          {
            uri: 'oura://guidance',
            mimeType: 'text/markdown',
            text: guidance,
          },
        ],
      };
    },
  );
}
