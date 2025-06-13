
// src/ai/flows/recommend-activity.ts
'use server';

/**
 * @fileOverview AI flow for recommending activities based on trip details.
 *
 * - recommendActivity - A function that recommends an activity for the trip.
 * - RecommendActivityInput - The input type for the recommendActivity function.
 * - RecommendActivityOutput - The return type for the recommendActivity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendActivityInputSchema = z.object({
  city: z.string().describe('The city for which to recommend an activity.'),
  interests: z.string().optional().describe('The interests of the travelers.'),
  tripDetails: z.string().describe('Details of the trip, including dates and travelers.'),
});
export type RecommendActivityInput = z.infer<typeof RecommendActivityInputSchema>;

const RecommendActivityOutputSchema = z.object({
  activity: z.string().describe('A recommended activity for the trip.'),
  reason: z.string().describe('Why this activity is recommended.'),
  suggestedTime: z.string().optional().describe('A suggested time for the activity in HH:MM format. Example: "14:30"'),
});
export type RecommendActivityOutput = z.infer<typeof RecommendActivityOutputSchema>;

export async function recommendActivity(input: RecommendActivityInput): Promise<RecommendActivityOutput> {
  return recommendActivityFlow(input);
}

const recommendActivityPrompt = ai.definePrompt({
  name: 'recommendActivityPrompt',
  input: {schema: RecommendActivityInputSchema},
  output: {schema: RecommendActivityOutputSchema},
  prompt: `You are a travel expert specializing in family trips. Based on the trip details, city, and interests, recommend one activity.
Also suggest an ideal time (HH:MM format, e.g., "10:00" or "15:30") for this activity.

Trip Details: {{{tripDetails}}}
City: {{{city}}}
Interests: {{{interests}}}

Respond with the activity, the reason, and the suggested time. IMPORTANT: Your entire response (activity, reason, and suggestedTime if provided) MUST be in Spanish.
`,
});

const recommendActivityFlow = ai.defineFlow(
  {
    name: 'recommendActivityFlow',
    inputSchema: RecommendActivityInputSchema,
    outputSchema: RecommendActivityOutputSchema,
  },
  async input => {
    const {output} = await recommendActivityPrompt(input);
    return output!;
  }
);

