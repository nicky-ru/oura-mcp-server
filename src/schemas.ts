import { z } from 'zod';

const dateRange = {
  startDate: z.string(),
  endDate: z.string(),
};

const dateTimeRange = {
  startDateTime: z.string(),
  endDateTime: z.string(),
};

export const ouraFetchInputShape = {
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
    .describe(
      'Start datetime in ISO format with timezone (for heartrate endpoint)',
    ),
  endDateTime: z
    .string()
    .optional()
    .describe(
      'End datetime in ISO format with timezone (for heartrate endpoint)',
    ),
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

export const ouraFetchValidationSchema = z.union([
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
