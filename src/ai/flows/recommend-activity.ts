
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
  category: z.string().optional().describe('The desired category for the activity (e.g., "Comida", "Cultural").'),
  interests: z.string().optional().describe('The interests of the travelers.'),
  tripDetails: z.string().describe('Details of the trip, including dates and travelers.'),
});
export type RecommendActivityInput = z.infer<typeof RecommendActivityInputSchema>;

const RecommendActivityOutputSchema = z.object({
  activity: z.string().describe('A recommended activity for the trip. Must be in Spanish.'),
  reason: z.string().describe('Why this activity is recommended. Must be very concise and in Spanish.'),
  suggestedTime: z.string().optional().describe('A suggested time for the activity in HH:MM format. Example: "14:30"'),
  category: z.string().optional().describe('The category for the recommended activity. Should be one of: Viaje, Comida, Cultural, Ocio, Trabajo, Alojamiento, Otro. Default to Ocio if unsure.'),
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
The entire response MUST be in Spanish. The reason MUST be very short (10-15 words max).

Trip Context: {{{tripDetails}}}
City: {{{city}}}
{{#if category}}
Desired Category: {{{category}}}
{{/if}}
Interests: {{{interests}}}

Your recommendation MUST belong to the desired category if provided.
Provide the activity name, a very short reason, a suggested time (HH:MM format), and the activity category.
The category must be one of: Viaje, Comida, Cultural, Ocio, Trabajo, Alojamiento, Otro.

Example output format:
Activity: Visita al Museo del Prado
Reason: Explora obras maestras del arte español en un entorno culturalmente rico.
SuggestedTime: "11:00"
Category: "Cultural"
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
