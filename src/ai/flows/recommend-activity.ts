
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
  activity: z.string().describe('A recommended activity for the trip. Must be in Spanish.'),
  reason: z.string().describe('Why this activity is recommended. Must be very concise and in Spanish.'),
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
  prompt: `You are a concise travel assistant. Recommend a single, compelling activity.
If interests are not provided, focus on popular or family-friendly options if context suggests it.
The entire response MUST be in Spanish. The reason MUST be very short (10-15 words max).

Trip Context: {{{tripDetails}}}
City: {{{city}}}
Interests: {{{interests}}}

Provide the activity name, a very short reason, and a suggested time (HH:MM format, e.g., "10:00" or "15:30").
Example output format:
Activity: Visita al Museo del Prado
Reason: Explora obras maestras del arte español en un entorno culturalmente rico.
SuggestedTime: "11:00"
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

