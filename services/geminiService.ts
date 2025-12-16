import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, PinShape } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const findLocationWithAI = async (query: string): Promise<AIResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the coordinates for the following location or describe the location request: "${query}". 
      Also suggest a name, a hex color code relevant to the place (e.g., green for park, blue for water), and a shape.
      If the user provides explicit coordinates in the text, use those.`,
      config: {
        tools: [{ googleSearch: {} }], // Use Google Search to find real coordinates
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: "Latitude of the location" },
            lng: { type: Type.NUMBER, description: "Longitude of the location" },
            suggestedName: { type: Type.STRING, description: "A short label for the pin" },
            suggestedColor: { type: Type.STRING, description: "Hex color code (e.g. #FF0000)" },
            suggestedShape: { type: Type.STRING, enum: ['pin', 'circle', 'star', 'square', 'triangle'] },
            description: { type: Type.STRING, description: "A brief description of the place" }
          },
          required: ["lat", "lng", "suggestedName", "suggestedColor", "suggestedShape"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};