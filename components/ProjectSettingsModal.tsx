
import React, { useState } from 'react';
import { X, Settings, Sparkles, Languages, Sliders, Save, FileEdit, Loader2 } from 'lucide-react';
import { AVAILABLE_MODELS, SUPPORTED_LANGUAGES } from '../types';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { generateFandomGlossary } from '../services/geminiService';

interface SettingsProps {
  uiLang: LanguageCode;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  fandom?: string;
  settings: {
    selectedModel: string;
    setSelectedModel: (v: string) => void;
    targetLang: string;
    setTargetLang: (v: string) => void;
    batchSize: number;
    setBatchSize: (v: number) => void;
    contextWindow: number;
    setContextWindow: (v: number) => void;
    customPrompt: string;
    setCustomPrompt: (v: string) => void;
    refinePromptTemplate: string;
    setRefinePromptTemplate: (v: string) => void;
    glossary: string;
    setGlossary: (v: string) => void;
    includeTags: boolean;
    setIncludeTags: (v: boolean) => void;
    tagInstruction: string;
    setTagInstruction: (v: string) => void;
  };
  onRestorePrompt: () => void;
}

const ProjectSettingsModal: React.FC<SettingsProps> = ({ uiLang, isOpen, onClose, onSave, settings, onRestorePrompt, fandom }) => {
  const t = UI_STRINGS[uiLang];
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);

  if (!isOpen) return null;

  const handleAutoGlossary = async () => {
    if (!fandom || fandom === 'Unknown Fandom') {
      alert("Please ensure a valid Fandom is detected or set in the main input screen before generating a glossary.");
      return;
    }
    setIsGeneratingGlossary(true);
    try {
        const result = await generateFandomGlossary(fandom, settings.targetLang, settings.selectedModel);
        if (result) {
            const newGlossary = settings.glossary ? settings.glossary + '\n\n' + result : result;
            settings.setGlossary(newGlossary);
        } else {
            alert("Glossary generation failed. Please check your API Quota.");
        }
    } catch (e) {
        alert("Glossary generation error.");
    } finally {
        setIsGeneratingGlossary(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#990000]" />
            {t.advancedSettings}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Basic Config (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> {t.aiModel}
                  </label>
                  <select 
                    value={settings.selectedModel}
                    onChange={(e) => settings.setSelectedModel(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#990000]/20"
                  >
                    {AVAILABLE_MODELS.map(model => (
                      <option key={model.id} value={model.id}>{model.name.split(' (')[0]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Languages className="w-3 h-3" /> {t.targetLang}
                  </label>
                  <select 
                    value={settings.targetLang}
                    onChange={(e) => settings.setTargetLang(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#990000]/20"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.batchSize}</label>
                    <span className="text-xs font-mono font-bold text-[#990000] dark:text-red-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{settings.batchSize} {t.blocks}</span>
                  </div>
                  <input type="range" min="1" max="20" value={settings.batchSize} onChange={(e) => settings.setBatchSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000] dark:accent-red-600" />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{t.batchSizeDesc}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.contextWindow}</label>
                    <span className="text-xs font-mono font-bold text-[#990000] dark:text-red-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{t.prev} {settings.contextWindow} {t.blocks}</span>
                  </div>
                  <input type="range" min="0" max="10" value={settings.contextWindow} onChange={(e) => settings.setContextWindow(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000] dark:accent-red-600" />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{t.contextWindowDesc}</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="includeTagsModal" 
                    checked={settings.includeTags} 
                    onChange={(e) => settings.setIncludeTags(e.target.checked)} 
                    className="w-5 h-5 text-[#990000] border-gray-300 dark:border-gray-700 rounded focus:ring-0 cursor-pointer accent-[#990000]" 
                  />
                  <label htmlFor="includeTagsModal" className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer">{t.includeTags}</label>
                </div>
              </div>
            </div>

            {/* Right Column: Prompts (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.systemPrompt}</label>
                  <button onClick={onRestorePrompt} className="text-[10px] text-[#990000] dark:text-red-400 hover:underline font-bold uppercase tracking-tight" title="Reset to default prompt">{t.restorePrompt}</button>
                </div>
                <textarea 
                  value={settings.customPrompt} 
                  onChange={(e) => settings.setCustomPrompt(e.target.value)} 
                  className="w-full text-sm p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner font-mono" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FileEdit className="w-3 h-3"/> Fix / Refine Template
                    </label>
                    <textarea 
                      value={settings.refinePromptTemplate} 
                      onChange={(e) => settings.setRefinePromptTemplate(e.target.value)} 
                      placeholder="Template for refinement..."
                      className="w-full text-xs p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner font-mono leading-relaxed" 
                    />
                     <p className="text-[10px] text-gray-400">Vars: {'{{original}}, {{translated}}, {{instruction}}'}</p>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.glossary}</label>
                       {fandom && fandom !== 'Unknown Fandom' && (
                            <button 
                                onClick={handleAutoGlossary} 
                                disabled={isGeneratingGlossary}
                                className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold disabled:opacity-50 uppercase tracking-tight"
                                title="Auto-generate glossary based on Fandom"
                            >
                                {isGeneratingGlossary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isGeneratingGlossary ? t.generating : t.autoGlossary}
                            </button>
                        )}
                    </div>
                    <textarea 
                      value={settings.glossary} 
                      onChange={(e) => settings.setGlossary(e.target.value)} 
                      placeholder={t.glossaryPlaceholder} 
                      className="w-full text-sm p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner" 
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 transition-colors">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">{t.pause}</button>
          <button onClick={onSave} className="px-10 py-2.5 bg-[#990000] dark:bg-[#b30000] text-white text-sm font-black rounded-xl hover:bg-[#800000] dark:hover:bg-red-800 shadow-lg shadow-red-900/10 flex items-center gap-2 transition-all active:scale-95">
            <Save className="w-4 h-4" /> {t.start}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
