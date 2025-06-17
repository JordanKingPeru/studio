
'use server';
/**
 * @fileOverview Genkit flow for generating a trip cover image using AI.
 *
 * - generateTripCoverImage - Generates a cover image based on trip details.
 * - GenerateTripCoverImageInput - Input type for the flow.
 * - GenerateTripCoverImageOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { TripType, TripStyle } from '@/lib/types'; // IMPORTED ENUMS

const GenerateTripCoverImageInputSchema = z.object({
  tripName: z.string().describe('El nombre o destino principal del viaje.'),
  startDate: z.string().describe('Fecha de inicio del viaje (YYYY-MM-DD).'),
  endDate: z.string().describe('Fecha de fin del viaje (YYYY-MM-DD).'),
  tripType: z.nativeEnum(TripType).describe('El tipo de viaje (ej: Ocio, Negocios).'),
  tripStyle: z.nativeEnum(TripStyle).describe('El estilo del viaje (ej: Familiar, Aventura, Lujo).'),
  numTravelers: z.number().optional().describe('Número total de personas que viajan.'),
  numAdults: z.number().optional().describe('Número de adultos.'),
  numChildren: z.number().optional().describe('Número de niños.'),
  childrenAges: z.string().optional().describe('Edades de los niños, separadas por coma (ej: "5, 8, 12").'),
});
export type GenerateTripCoverImageInput = z.infer<typeof GenerateTripCoverImageInputSchema>;

const GenerateTripCoverImageOutputSchema = z.object({
  imageDataUri: z.string().describe("La imagen generada como un data URI (e.g., 'data:image/png;base64,...')."),
});
export type GenerateTripCoverImageOutput = z.infer<typeof GenerateTripCoverImageOutputSchema>;

export async function generateTripCoverImage(input: GenerateTripCoverImageInput): Promise<GenerateTripCoverImageOutput> {
  return generateTripCoverImageFlow(input);
}

const imagePromptDefinition = ai.definePrompt({
  name: 'generateTripCoverImagePrompt',
  input: {schema: GenerateTripCoverImageInputSchema},
  prompt: `Genera una imagen de portada para un viaje. La imagen debe ser MUY MOTIVADORA, ATRACTIVA y LO MÁS REALISTA POSIBLE (estilo fotográfico o ilustración hiperrealista), adecuada como foto principal para un planificador de viajes.

Detalles del Viaje:
- Nombre/Tema del Viaje: {{{tripName}}}
- Fechas: Desde {{{startDate}}} hasta {{{endDate}}}
- Tipo de Viaje: {{{tripType}}}
- Estilo de Viaje: {{{tripStyle}}}
{{#if numTravelers}}
- Grupo de Viajeros: {{numTravelers}} personas en total.
  {{#if numAdults}} - Adultos: {{numAdults}}{{/if}}
  {{#if numChildren}} - Niños: {{numChildren}}{{#if childrenAges}} (Edades: {{childrenAges}}){{/if}}{{/if}}
{{/if}}

Consideraciones para la imagen:
- Escena: Evoca la emoción y el ambiente principal del viaje (ej: aventura en montañas, relajación en playa tropical, exploración cultural en ciudad histórica, diversión familiar en parque temático, elegancia en un viaje de negocios con toques de ocio).
- Realismo: Busca un estilo fotográfico de alta calidad o una ilustración digital hiperrealista. Evita personajes de dibujos animados o estilos demasiado abstractos.
- Composición: Atractiva visualmente, con buena iluminación y colores vibrantes pero naturales.
- Relevancia: Debe ser claramente relevante para el tipo de viaje y destino/tema mencionado.
- Formato: Horizontal (apaisado), ideal para una imagen de portada.
- Sin Texto: No incluyas ningún texto superpuesto en la imagen.

Ejemplo de descripción para la IA (si fuera un viaje familiar a la playa en verano): "Una familia sonriente (dos adultos, dos niños pequeños de 4 y 7 años) construyendo un castillo de arena en una playa tropical soleada, con aguas turquesas y palmeras al fondo. Estilo fotográfico realista y alegre."
Ejemplo para aventura en montañas: "Impresionante vista de un excursionista llegando a la cima de una montaña al amanecer, con un vasto paisaje montañoso extendiéndose abajo. Estilo fotográfico realista y épico."

Basado en los detalles proporcionados, crea la imagen.
`,
});

const generateTripCoverImageFlow = ai.defineFlow(
  {
    name: 'generateTripCoverImageFlow',
    inputSchema: GenerateTripCoverImageInputSchema,
    outputSchema: GenerateTripCoverImageOutputSchema,
  },
  async (input) => {
    // 1. Resolve the PromptFn with the input to get a GenerateRequest object.
    // This object will contain the rendered prompt string within its `messages` structure.
    const populatedGenerateRequest = await imagePromptDefinition(input);

    // 2. Pass this resolved GenerateRequest to ai.generate, ensuring necessary model and config.
    const { media } = await ai.generate({
      ...populatedGenerateRequest, // Spread the request, which includes messages with rendered prompt
      model: 'googleai/gemini-2.0-flash-exp', // Ensure the correct model for image generation
      config: {
        ...(populatedGenerateRequest.config || {}), // Merge with any config from the prompt definition
        responseModalities: ['TEXT', 'IMAGE'], // Crucial for image generation
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });

    if (!media?.url) {
      console.error('Image generation failed. Input:', input, 'Response media:', media);
      throw new Error('La IA no pudo generar una imagen o no devolvió una URL válida. Intenta ajustar los detalles del viaje o reintentar.');
    }

    return { imageDataUri: media.url };
  }
);
