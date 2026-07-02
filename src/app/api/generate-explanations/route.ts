import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize Gemini (via Third-Party OpenAI API format)
const geminiOpenai = new OpenAI({
  baseURL: process.env.GEMINI_BASE_URL || "https://api.vectorengine.cn/v1",
  apiKey: process.env.GEMINI_API_KEY || "missing_key",
});
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

// Initialize DeepSeek
const openai = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "missing_key",
});
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";

// A simple delay function to handle potential rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const { sentences, promptTemplate } = await request.json();

    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid list of sentences." },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY || !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "Missing API keys on server. Please check your .env file." },
        { status: 500 },
      );
    }

    const resultsData = [];

    // Process each sentence
    for (const sentence of sentences) {
      const systemPrompt = promptTemplate;
      const userMessage = sentence; // Pass the sentence directly as the user message

      try {
        // Fetch from both APIs concurrently and independently
        const results = await Promise.allSettled([
          getGeminiExplanation(systemPrompt, userMessage),
          getDeepseekExplanation(systemPrompt, userMessage),
        ]);

        const geminiResponse =
          results[0].status === "fulfilled"
            ? results[0].value
            : `Gemini Error: ${results[0].reason?.message || "Unknown error"}`;

        const deepseekResponse =
          results[1].status === "fulfilled"
            ? results[1].value
            : `DeepSeek Error: ${results[1].reason?.message || "Unknown error"}`;

        // Attempt to parse JSON if the model returns it
        const parseResponse = (res: any) => {
          if (typeof res !== "string") return res; // Error string fallback from above
          try {
            return JSON.parse(res);
          } catch (e) {
            return res; // Return raw string if not valid JSON
          }
        };

        resultsData.push({
          Sentence: sentence,
          "Gemini 3.1 Pro": parseResponse(geminiResponse),
          DeepSeek: parseResponse(deepseekResponse),
        });

        // Add a small delay between requests to avoid hitting rate limits too quickly
        await delay(500);
      } catch (err: any) {
        console.error(`Error processing sentence "${sentence}":`, err);
        // Fallback for this specific word so the whole batch doesn't fail
        resultsData.push({
          Sentence: sentence,
          "Gemini 3.1 Pro": `Error: ${err.message}`,
          DeepSeek: `Error: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ results: resultsData });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred processing your request." },
      { status: 500 },
    );
  }
}

// Helper to call Gemini via OpenAI format
async function getGeminiExplanation(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const completion = await geminiOpenai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: GEMINI_MODEL,
    response_format: { type: "json_object" },
  });

  return (
    completion.choices[0].message.content?.trim() || "No explanation provided."
  );
}

// Helper to call DeepSeek
async function getDeepseekExplanation(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: DEEPSEEK_MODEL,
    response_format: { type: "json_object" },
  });

  return (
    completion.choices[0].message.content?.trim() || "No explanation provided."
  );
}
