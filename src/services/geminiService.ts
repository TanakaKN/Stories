import { GoogleGenAI, Type, Modality } from "@google/genai";

export interface StoryScript {
  hook: string;
  body: string;
  payoff: string;
  dialogue: { character: string; text: string }[];
  visualPrompts: string[];
  narrationText: string;
}

export class GeminiService {
  private standardAi: GoogleGenAI;

  constructor(standardApiKey: string) {
    this.standardAi = new GoogleGenAI({ apiKey: standardApiKey });
  }

  async processStory(inputStory: string): Promise<StoryScript> {
    const response = await this.standardAi.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Transform this story into a structured script for a short video. 
      The story is in Shona or English: "${inputStory}"
      
      Requirements:
      1. Structure: Hook, Body, Payoff.
      2. Tone: Relatable, African background, warm and engaging.
      3. Dialogue: Transform narrative into dialogue where appropriate.
      4. Visual Prompts: Provide 3-5 descriptive visual prompts for an AI video generator. Each prompt should specify an African setting, characters, and lighting.
      5. Narration: A cohesive narration text that ties the story together.
      
      Output the result in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            body: { type: Type.STRING },
            payoff: { type: Type.STRING },
            dialogue: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  character: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["character", "text"]
              }
            },
            visualPrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            narrationText: { type: Type.STRING }
          },
          required: ["hook", "body", "payoff", "dialogue", "visualPrompts", "narrationText"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  }

  async generateNarration(text: string): Promise<string | undefined> {
    const response = await this.standardAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Narrate this story with a warm, wise African storytelling voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  async generateVideo(prompt: string, veoApiKey: string): Promise<string | undefined> {
    // Veo generation MUST use the paid API key
    const veoAi = new GoogleGenAI({ apiKey: veoApiKey });
    
    let operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt}, cinematic lighting, high quality, African aesthetic`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Re-initialize to ensure we use the most up-to-date key state
      const pollingAi = new GoogleGenAI({ apiKey: veoApiKey });
      operation = await pollingAi.operations.getVideosOperation({ operation: operation });
    }

    return operation.response?.generatedVideos?.[0]?.video?.uri;
  }
}
