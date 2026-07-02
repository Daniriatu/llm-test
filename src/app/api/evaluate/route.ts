import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.EVALUATOR_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.EVALUATOR_API_KEY || "missing_key",
});

const EVALUATOR_MODEL = process.env.EVALUATOR_MODEL || "gpt-4o";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const systemPrompt = `You are an expert Spanish linguist acting as an evaluator.
You will be provided with:
1. A Sentence.
2. The Ground Truth (Correct Country and Explanation).
3. A Model's Prediction (Predicted Country and Explanation).

Your task is to score the model's prediction according to these rules:
- Country Score: If the model's predicted country matches the Ground Truth's country exactly (ignoring case), give 1 point. Otherwise, 0 points.
- Explanation Score: If the model's explanation is correct and captures the same core meaning as the Ground Truth's explanation, give 1 point. Otherwise, 0 points.

You must return a JSON object with this exact structure:
{
  "country_score": 0 or 1,
  "explanation_score": 0 or 1
}`;

export async function POST(request: NextRequest) {
  try {
    const { resultsData, answerData } = await request.json();

    if (!resultsData || !answerData) {
      return NextResponse.json(
        { error: "Missing resultsData or answerData." },
        { status: 400 },
      );
    }

    if (!process.env.EVALUATOR_API_KEY) {
      return NextResponse.json(
        { error: "Missing EVALUATOR_API_KEY on server. Please check your .env file." },
        { status: 500 },
      );
    }

    const evaluationResults = [];

    // Map answers by sentence for easy lookup
    const answerMap = new Map();
    for (const ans of answerData) {
      answerMap.set(ans.Sentence, ans);
    }

    for (const res of resultsData) {
      const sentence = res.Sentence;
      const groundTruth = answerMap.get(sentence);

      if (!groundTruth) {
        evaluationResults.push({
          ...res,
          Evaluation: "No ground truth found for this sentence."
        });
        continue;
      }

      const geminiPred = res["Gemini 3.1 Pro"];
      const deepseekPred = res["DeepSeek"];

      const evaluateModel = async (modelName: string, prediction: any) => {
        if (typeof prediction === "string" || !prediction.predicted_country) {
          return { error: "Invalid prediction format", country_score: 0, explanation_score: 0 };
        }

        const userMessage = `Sentence: "${sentence}"
Ground Truth:
Country: ${groundTruth.predicted_country}
Explanation: ${groundTruth.explanation}

${modelName} Prediction:
Country: ${prediction.predicted_country}
Explanation: ${prediction.explanation}`;

        try {
          const completion = await openai.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            model: EVALUATOR_MODEL,
            response_format: { type: "json_object" },
          });

          const content = completion.choices[0].message.content?.trim();
          if (!content) throw new Error("Empty response");
          return JSON.parse(content);
        } catch (err: any) {
          console.error(`Evaluation error for ${modelName} on sentence "${sentence}":`, err);
          return { error: err.message, country_score: 0, explanation_score: 0 };
        }
      };

      const [geminiEval, deepseekEval] = await Promise.all([
        evaluateModel("Gemini", geminiPred),
        evaluateModel("DeepSeek", deepseekPred)
      ]);

      evaluationResults.push({
        ...res,
        GroundTruth: {
          predicted_country: groundTruth.predicted_country,
          explanation: groundTruth.explanation
        },
        "Gemini_Evaluation": geminiEval,
        "DeepSeek_Evaluation": deepseekEval
      });

      await delay(200); // basic rate limit protection
    }

    return NextResponse.json({ results: evaluationResults });
  } catch (error: any) {
    console.error("Evaluation API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during evaluation." },
      { status: 500 },
    );
  }
}
