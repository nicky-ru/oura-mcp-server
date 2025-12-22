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
