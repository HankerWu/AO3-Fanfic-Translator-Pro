
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationBlock } from "../types";
import { translateWithGoogle } from "./googleTranslateService";

// Helper to instantiate AI client dynamically
const getAI = (customKey?: string) => {
  // Prioritize custom key if provided and not empty/whitespace
  const key = customKey?.trim() ? customKey.trim() : process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please provide a key in settings or configure the environment.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
  // Check for standard HTTP status codes in error object
  const status = error.status || error.response?.status;
  if (status === 429 || status === 500 || status === 503 || status === 502 || status === 504) {
    return true;
  }
  
  // Check error message string patterns common in GenAI SDK
  const msg = error.message?.toLowerCase() || '';
  if (
    msg.includes('resource has been exhausted') || 
    msg.includes('too many requests') || 
    msg.includes('quota') ||
    msg.includes('overloaded') ||
    msg.includes('server error') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }

  return false;
};

// Generic retry wrapper with exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 2000): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        console.error(`API Call failed permanently after ${attempt} retries. Reason:`, error.message);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
      // Add a little jitter to prevent thundering herd
      const jitter = Math.random() * 500; 
      console.warn(`API Error (${error.message}). Retrying in ${(delay + jitter).toFixed(0)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      
      await wait(delay + jitter);
      attempt++;
    }
  }
  throw new Error("Unreachable code");
}

export const identifyFandom = async (textSample: string, model: string, apiKey?: string): Promise<string> => {
  try {
    // Basic identification uses Gemini Flash even if Google Translate is selected for main translation
    const modelToUse = model === 'google-translate' ? 'gemini-3-flash-preview' : model;
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Analyze the following text sample from a fanfiction. Identify the "Fandom" (the original work, show, book, or game it is based on). Return ONLY the name of the fandom. If unknown, return "General".\n\nText: "${textSample.substring(0, 1000)}..."`,
    });
    return response.text?.trim() || "Unknown";
  } catch (error) {
    console.error("Error identifying fandom:", error);
    return "General";
  }
};

export const generateFandomGlossary = async (fandom: string, targetLang: string, model: string, apiKey?: string): Promise<string> => {
  try {
    // Glossary generation always needs an LLM
    const modelToUse = model === 'google-translate' ? 'gemini-3-flash-preview' : model;
    const ai = getAI(apiKey);
    const prompt = `Task: Create a concise glossary for the fandom "${fandom}".
    Target Language: ${targetLang}
    
    Include:
    1. Key Character Names (Original -> Translated)
    2. Specific Terminology / Jargon (Original -> Translated)
    3. Location Names
    
    Output Format:
    Original Term: Translated Term (Brief Note if needed)
    
    Keep it strictly relevant to translation and helpful for maintaining consistency. Do not output conversational text.`;

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Glossary generation error:", error);
    return ""; 
  }
};

interface TranslationOptions {
  model: string;
  customPrompt: string;
  previousContext: string;
  tags?: string[];
  tagInstruction?: string;
  glossary?: string;
  apiKey?: string; // Add apiKey option
}

export const translateBatch = async (
  blocks: string[], 
  targetLang: string, 
  fandom: string, 
  options: TranslationOptions
): Promise<string[]> => {
  
  const { model, customPrompt, previousContext, tags, tagInstruction, glossary, apiKey } = options;

  // --- GOOGLE TRANSLATE PATH ---
  if (model === 'google-translate') {
     return callWithRetry(async () => {
         return await translateWithGoogle(blocks, targetLang, apiKey);
     }, 2, 1000);
  }

  // --- GEMINI LLM PATH ---
  const systemInstruction = customPrompt || `You are a professional literary translator specializing in Fanfiction.`;

  // Construct the prompt with all metadata
  let prompt = `
    ${systemInstruction}
    
    Target Language: ${targetLang}
    Fandom Context: ${fandom}
  `;

  if (tags && tags.length > 0) {
    prompt += `\n    Work Tags/Keywords: ${tags.join(', ')}`;
    if (tagInstruction) {
        prompt += `\n    Instruction for Tags: ${tagInstruction}`;
    }
  }

  if (glossary) {
      prompt += `\n    Glossary / Style Guide:\n${glossary}`;
  }

  if (previousContext) {
      prompt += `\n\n    CONTEXT FROM PREVIOUS SECTION (For continuity only, DO NOT TRANSLATE THIS):\n    "${previousContext}"`;
  }

  prompt += `
    
    Task: Translate the following array of text blocks.
    
    Guidelines:
    1. Output MUST be a JSON array of strings, with exactly corresponding indices to the input.
    2. Ensure narrative flow connects smoothly with the context provided.
    
    Input Blocks:
    ${JSON.stringify(blocks)}
  `;

  // Wrap the actual API call in our retry logic
  return callWithRetry(async () => {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return blocks; 

    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length === blocks.length) {
      return parsed;
    }
    throw new Error("Length mismatch in translation response");
  }, 3, 2000); // Max 3 retries, start with 2s delay
};

export const refineBlock = async (
  original: string, 
  currentTranslation: string, 
  targetLang: string, 
  fandom: string, 
  model: string,
  userInstruction: string,
  promptTemplate: string,
  apiKey?: string
): Promise<string> => {
  
  // Refine always uses LLM, even if base translation was Google
  const modelToUse = model === 'google-translate' ? 'gemini-3-flash-preview' : model;

  const systemInstruction = `You are a professional literary translator and editor. 
Your task is to REWRITE the "Current Draft" based on the "User Instruction".
If the User Instruction asks for a translation or correction, output ONLY the final corrected text.
Do not output explanation. Do not output markdown code fences.`;

  const prompt = promptTemplate
    .replace('{{original}}', original)
    .replace('{{translated}}', currentTranslation)
    .replace('{{targetLang}}', targetLang)
    .replace('{{fandom}}', fandom)
    .replace('{{instruction}}', userInstruction);

  try {
    const ai = getAI(apiKey);
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, 
      }
    });
    
    let text = response.text?.trim() || "";
    text = text.replace(/^```(json|markdown|text)?\n/i, '').replace(/\n```$/, '');
    
    return text || currentTranslation;
  } catch (error) {
    console.error("Refinement error:", error);
    return currentTranslation;
  }
};
