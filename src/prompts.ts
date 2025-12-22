import { Prompt } from '@modelcontextprotocol/sdk/types.js';

// Define the prompts with guidance for automatic correlation
const getReadinessPrompt: Prompt = {
  id: 'get-readiness',
  name: 'Get readiness data',
  description: 'Retrieve readiness scores from your Oura ring',
  text: "Show me my readiness scores for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily readiness data\n2. Analyze the data to show average scores and trends\n3. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect readiness",
};

const getSleepPrompt: Prompt = {
  id: 'get-sleep',
  name: 'Get sleep data',
  description: 'Retrieve sleep metrics from your Oura ring',
  text: "Show me my sleep data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily sleep data\n2. Analyze the data to show sleep duration, efficiency, and other metrics\n3. IMPORTANT: When calculating sleep stage percentages (deep, REM, light), always use the total_sleep_duration as the denominator, NOT time_in_bed. This ensures calculations match what the Oura app shows.\n4. If visualizing sleep stages, show percentages of actual sleep time, not time in bed.\n5. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect sleep",
};

const getActivityPrompt: Prompt = {
  id: 'get-activity',
  name: 'Get activity data',
  description: 'Retrieve activity metrics from your Oura ring',
  text: "Show me my activity data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily activity data\n2. Analyze the data to show steps, calories, and activity levels\n3. Consider fetching tags data for the same period to look for correlations with meals, recovery practices, or other factors that might affect activity",
};

const getHeartRatePrompt: Prompt = {
  id: 'get-heart-rate',
  name: 'Get heart rate data',
  description: 'Retrieve heart rate data from your Oura ring',
  text: "Show me my heart rate data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get heart rate data\n2. Calculate average, minimum, and maximum heart rates over the specified period\n3. Be precise with time-based calculations and always verify the units of measurement (seconds vs. minutes vs. hours)\n4. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect heart rate",
};

const getHeartRateDuringSleepPrompt: Prompt = {
  id: 'get-heart-rate-during-sleep',
  name: 'Get heart rate during sleep',
  description: 'Retrieve heart rate data during sleep periods',
  text: "Show me my heart rate data during sleep for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get sleep data to identify sleep periods\n2. Use the oura-fetch tool to get heart rate data during those periods\n3. Analyze the data to show trends in heart rate during sleep\n4. Consider fetching tags data for the same period to look for correlations with evening activities, meals, or other factors that might affect night-time heart rate",
};

const getStressPrompt: Prompt = {
  id: 'get-stress',
  name: 'Get stress data',
  description: 'Retrieve stress metrics from your Oura ring',
  text: "Show me my stress data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the stress endpoint\n2. Analyze the data to show stress levels and recovery periods\n3. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect stress levels",
};

const getTagsPrompt: Prompt = {
  id: 'get-tags',
  name: 'Get Oura tags',
  description: 'Retrieve tags from your Oura ring',
  text: "Show me my tags for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the tags endpoint\n2. Analyze the data to show tags I've created\n3. Consider fetching health metrics (sleep, readiness, activity, stress) for the same period to identify patterns and correlations",
};

const analyzeHealthFactorsPrompt: Prompt = {
  id: 'analyze-health-factors',
  name: 'Analyze health factors',
  description: 'Analyze how different factors affect your health metrics',
  text: "Analyze how different factors affect my [METRIC_TYPE] for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get [METRIC_TYPE] data\n2. Use the oura-fetch tool to get tags data for the same period\n3. When processing duration data, always verify the units (the API provides durations in seconds) and convert appropriately to hours/minutes for visualization\n4. For sleep data, always calculate stage percentages based on total_sleep_duration, not time_in_bed\n5. Analyze the data to identify patterns and correlations\n6. Create a visualization showing how different factors (such as meals, activities, etc.) in my tags relate to my [METRIC_TYPE]",
};

const analyzeMealEffectsPrompt: Prompt = {
  id: 'analyze-meal-effects',
  name: 'Analyze meal effects on health',
  description: 'Analyze how different meals affect your health metrics',
  text: "Analyze how my meals affect my [METRIC_TYPE] for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get [METRIC_TYPE] data\n2. Use the oura-fetch tool to get tags data for the same period\n3. Filter the tags to focus on those containing meal descriptions (like 'Dinner', 'Breakfast', etc.)\n4. Analyze the data to identify patterns between meal types and health metrics\n5. Create a visualization showing how different meals relate to my [METRIC_TYPE]",
};

const verifyCalculationsPrompt: Prompt = {
  id: 'verify-calculations',
  name: 'Verify calculations',
  description: 'Double-check calculations for accuracy',
  text: "Verify my [METRIC_TYPE] calculations for [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get raw data\n2. Show your calculation methodology step-by-step, including units and conversion factors\n3. For sleep data, verify that percentages match what would be shown in the Oura app (based on total_sleep_duration, not time_in_bed)\n4. Identify any potential calculation errors or statistical anomalies\n5. Present both raw values and calculated percentages/averages side by side for transparency",
};

const getSleepDetailsPrompt: Prompt = {
  id: 'get-sleep-details',
  name: 'Get detailed sleep information',
  description:
    'Retrieve and explain detailed sleep metrics from your Oura ring',
  text: "Show me detailed analysis of my sleep for [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the sleep_sessions endpoint for detailed sleep metrics\n2. Understand key fields: total_sleep_duration (actual sleep in seconds), time_in_bed (total time in seconds), awake_time (awake time in seconds)\n3. Sleep stage data includes: deep_sleep_duration, rem_sleep_duration, light_sleep_duration (all in seconds)\n4. Calculate sleep efficiency as (total_sleep_duration / time_in_bed * 100)\n5. Calculate sleep stage percentages using total_sleep_duration as the denominator, not time_in_bed\n6. Present all findings with original units AND human-readable formats (convert seconds to hours/minutes)",
};

const dataHandlingGuidelines: Prompt = {
  id: 'data-handling-guidelines',
  name: 'Data handling guidelines',
  description: 'Guidelines for handling Oura data correctly',
  text: 'Important guidelines for analyzing Oura data:\n\n1. TIME UNITS: All duration fields in the API response are in seconds. Always convert to hours/minutes for user-friendly display.\n\n2. SLEEP PERCENTAGES: Always calculate sleep stage percentages (deep, REM, light) using total_sleep_duration as the denominator, not time_in_bed. This matches how percentages are displayed in the Oura app.\n\n3. EFFICIENCY: Sleep efficiency is total_sleep_duration divided by time_in_bed, multiplied by 100 to get a percentage.\n\n4. TAGS: Custom tags (with GUID tag_type_code) usually contain meal information in the comment field.\n\n5. CORRELATIONS: When analyzing correlations, always ensure data points are properly time-aligned and use appropriate time offsets when looking for delayed effects.\n\n6. VISUALIZATION: Always show both raw values and percentages in visualizations, and clearly label which denominator was used for percentage calculations.',
};

// Store all prompts in an array
export const prompts = [
  getReadinessPrompt,
  getSleepPrompt,
  getActivityPrompt,
  getHeartRatePrompt,
  getHeartRateDuringSleepPrompt,
  getStressPrompt,
  getTagsPrompt,
  analyzeHealthFactorsPrompt,
  analyzeMealEffectsPrompt,
  verifyCalculationsPrompt,
  getSleepDetailsPrompt,
  dataHandlingGuidelines,
];
