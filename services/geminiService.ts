
import { GoogleGenAI, Type } from "@google/genai";
import { AITip } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIGameTip = async (score: number, highScore: number, snakeLength: number): Promise<AITip> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The player is playing Snake. Current Score: ${score}, High Score: ${highScore}, Snake Length: ${snakeLength}. 
      Give a short (max 15 words) pro tip or funny commentary on their progress.`,
      config: {
        responseMimeType: "application/json",
        // Using responseSchema to ensure reliable JSON structure from the model.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'A short pro tip or funny commentary.',
            },
            type: {
              type: Type.STRING,
              enum: ['strategy', 'commentary', 'congrats'],
              description: 'The type of message provided.',
            },
          },
          required: ["text", "type"],
          propertyOrdering: ["text", "type"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      text: result.text || "Keep your head on straight!",
      type: result.type || "commentary"
    };
  } catch (error) {
    console.error("AI Tip Error:", error);
    return {
      text: "Focus and don't hit the walls!",
      type: "strategy"
    };
  }
};
