import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || (window as any).GEMINI_API_KEY;
};

export async function generateWithGeminiSDK(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error: any) {
    console.error("[Gemini SDK Error]:", error);
    throw new Error(`AI SDK Error: ${error.message || String(error)}`);
  }
}
