
export interface TranslationBlock {
  id: string;
  original: string;
  translated: string;
  isEdited: boolean;
  isLoading: boolean;
  isFavorite?: boolean; // Mark paragraph as favorite
  note?: string; // New: User insights/notes
}

export interface FicMetadata {
  title: string;
  author: string;
  fandom: string;
  tags?: string[]; // Extracted tags
  originalLanguage: string;
  targetLanguage: string;
  model: string;
  // Settings used for this translation
  customPrompt?: string; 
  refinePromptTemplate?: string; // Template for the "Fix/Refine" feature
  contextWindow?: number; 
  batchSize?: number;
  includeTags?: boolean;
  tagInstruction?: string;
  glossary?: string;
  url?: string;
  date: string;
}

export interface TranslationProject {
  id: string;
  metadata: FicMetadata;
  blocks: TranslationBlock[];
  lastModified: number;
  bookmarkBlockId?: string; // Track reading progress
}

export enum DisplayMode {
  SIDE_BY_SIDE = 'SIDE_BY_SIDE',
  INTERLINEAR = 'INTERLINEAR',
  TRANSLATED_ONLY = 'TRANSLATED_ONLY',
}

export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ru', name: 'Russian' },
];

export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Recommended)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Best Quality)' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
];

export const DEFAULT_PROMPT = `You are a professional literary translator specializing in Fanfiction.
Maintain the character's voice, tone, and narrative style. 
Use fandom-specific terminology correctly.
Optimize typography for reading comfort.`;

export const DEFAULT_REFINE_PROMPT = `You are a professional editor.
Task: specific improvement of a translation segment.

Context:
Fandom: {{fandom}}
Target Language: {{targetLang}}

Source:
{{original}}

Current Draft:
{{translated}}

Instruction:
{{instruction}}

Requirements:
1. Output ONLY the result.
2. Do not include "Here is the translation".
3. If the instruction asks to re-translate, ignore the Current Draft.`;
