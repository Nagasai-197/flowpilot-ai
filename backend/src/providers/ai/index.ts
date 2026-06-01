import { GeminiProvider } from "./gemini.provider.js";
import { AIProvider } from "./ai.provider.js";

export const getAIProvider = (): AIProvider => {
  // Returns swappable GeminiProvider implementation
  return new GeminiProvider();
};

export * from "./ai.provider.js";
