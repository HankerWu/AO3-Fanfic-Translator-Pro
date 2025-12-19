
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationBlock } from "../types";

// Always use process.env.API_KEY directly as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const identifyFandom = async (textSample: string, model: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Analyze the following text sample from a fanfiction. Identify the "Fandom" (the original work, show, book, or game it is based on). Return ONLY the name of the fandom. If unknown, return "General".\n\nText: "${textSample.substring(0, 1000)}..."`,
    });
    return response.text?.trim() || "Unknown";
  } catch (error) {
    console.error("Error identifying fandom:", error);
    return "General";
  }
};

export const generateFandomGlossary = async (fandom: string, targetLang: string, model: string): Promise<string> => {
  try {
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
      model: model,
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Glossary generation error:", error);
    // Explicitly returning null or empty string, UI should handle "empty" as failure if needed or user can retry
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
}

export const translateBatch = async (
  blocks: string[], 
  targetLang: string, 
  fandom: string, 
  options: TranslationOptions
): Promise<string[]> => {
  
  const { model, customPrompt, previousContext, tags, tagInstruction, glossary } = options;

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

  try {
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
    return blocks.map(() => "Translation Error: Length mismatch");
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const refineBlock = async (
  original: string, 
  currentTranslation: string, 
  targetLang: string, 
  fandom: string, 
  model: string,
  userInstruction: string,
  promptTemplate: string
): Promise<string> => {
  
  // Use a system instruction to enforce behavior
  const systemInstruction = `You are a professional literary translator and editor. 
Your task is to REWRITE the "Current Draft" based on the "User Instruction".
If the User Instruction asks for a translation or correction, output ONLY the final corrected text.
Do not output explanation. Do not output markdown code fences.`;

  // Interpolate the template
  const prompt = promptTemplate
    .replace('{{original}}', original)
    .replace('{{translated}}', currentTranslation)
    .replace('{{targetLang}}', targetLang)
    .replace('{{fandom}}', fandom)
    .replace('{{instruction}}', userInstruction);

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temp for precise fixes
      }
    });
    
    let text = response.text?.trim() || "";
    // Clean up markdown code blocks if present
    text = text.replace(/^```(json|markdown|text)?\n/i, '').replace(/\n```$/, '');
    // Strip surrounding quotes if the model naively quoted the whole result
    if (text.startsWith('"') && text.endsWith('"') && text.length > 2) {
         // Only strip if it doesn't look like dialogue (e.g. "Hello," said John.)
         // Heuristic: If original has quotes, maybe output should too.
         // Safest bet for "Refine" is usually to strip outer wrapper quotes if they seem structural.
         // Let's just return trim() unless we see markdown.
    }
    return text || currentTranslation;
  } catch (error) {
    console.error("Refinement error:", error);
    return currentTranslation;
  }
};
