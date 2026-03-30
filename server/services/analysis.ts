import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// ── Zod schema for the combined analysis response ──

export const analysisSchema = z.object({
  adSegments: z
    .array(
      z.object({
        text: z
          .string()
          .describe("The exact ad segment text from the transcript"),
        reason: z.string().describe("Why this is considered an ad"),
      }),
    )
    .describe("Advertisement segments found in the transcript"),

  cleanText: z
    .string()
    .describe(
      "The full transcript with ad segments removed. If no ads found, same as input.",
    ),

  topics: z
    .array(
      z.object({
        name: z.string().describe("Topic name in Spanish"),
        relevanceScore: z
          .number()
          .min(0)
          .max(1)
          .describe("How relevant this topic is to the episode (0-1)"),
      }),
    )
    .describe("Main topics discussed in the episode"),

  entities: z
    .array(
      z.object({
        name: z.string().describe("Entity name as mentioned in the transcript"),
        type: z
          .enum(["person", "org", "place", "event", "other"])
          .describe("Entity type"),
        mentionCount: z
          .number()
          .describe("Approximate number of times mentioned"),
        contextSnippets: z
          .array(z.string())
          .max(3)
          .describe(
            "Up to 3 short context snippets where the entity is mentioned",
          ),
      }),
    )
    .describe("Named entities extracted from the transcript"),

  summary: z.object({
    text: z
      .string()
      .describe(
        "A concise summary of the episode in 2-3 paragraphs, in Spanish",
      ),
    keyPoints: z
      .array(z.string())
      .describe("List of main takeaways from the episode, in Spanish"),
  }),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const ANALYSIS_PROMPT = `You are an expert podcast content analyst specializing in Colombian Spanish media.

Analyze the following podcast transcript and return a structured analysis with:

1. **Ad Segments**: Identify any advertisement or sponsor segments (e.g., "este episodio es presentado por...", promotional language, sponsor reads). Extract the exact text. If none found, return an empty array.

2. **Clean Text**: Return the full transcript with all identified ad segments removed. If no ads were found, return the original text unchanged.

3. **Topics**: Extract the 3-8 main topics discussed. Each topic should have a short name in Spanish and a relevance score (0-1).

4. **Entities**: Extract named entities — people, organizations, places, and events mentioned. For each, provide the name, type, approximate mention count, and up to 3 short context snippets showing how they're mentioned.

5. **Summary**: Write a concise summary (2-3 paragraphs) in Spanish, plus a list of key takeaways.

Be thorough but precise. All text output should be in Spanish.`;

/**
 * Run combined content analysis on a raw transcript using Gemini Flash.
 */
export async function analyzeTranscript(
  rawText: string,
): Promise<AnalysisResult> {
  const { object } = await generateObject({
    model: google("gemini-3-flash"),
    schema: analysisSchema,
    system: ANALYSIS_PROMPT,
    prompt: rawText,
  });

  return object;
}
