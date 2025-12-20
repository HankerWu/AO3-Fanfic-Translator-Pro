
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Link as LinkIcon, AlertCircle, ChevronDown, ChevronUp, Sliders, X, Sparkles, Languages, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { SUPPORTED_LANGUAGES, AVAILABLE_MODELS } from '../types';
import { generateFandomGlossary } from '../services/geminiService';

interface InputProps {
  uiLang: LanguageCode;
  inputType: 'file' | 'text' | 'url';
  setInputType: (t: 'file' | 'text' | 'url') => void;
  detectedMeta: any;
  inputFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputText: string;
  setInputText: (v: string) => void;
  inputUrl: string;
  setInputUrl: (v: string) => void;
  targetLang: string;
  setTargetLang: (v: string) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  batchSize: number;
  setBatchSize: (v: number) => void;
  contextWindow: number;
  setContextWindow: (v: number) => void;
  includeTags: boolean;
  setIncludeTags: (v: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (v: string) => void;
  tagInstruction: string;
  setTagInstruction: (v: string) => void;
  glossary: string;
  setGlossary: (v: string) => void;
  onRestorePrompt: () => void;
  onRemoveTag: (tag: string) => void;
  isProcessing: boolean;
  onStart: () => void;
}

const TranslationInput: React.FC<InputProps> = (props) => {
  const t = UI_STRINGS[props.uiLang];
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const [enableTranslation, setEnableTranslation] = useState(props.targetLang !== 'original');
  const [lastSelectedLang, setLastSelectedLang] = useState('zh-CN');

  // Handle toggle logic
  const handleToggleTranslation = (enabled: boolean) => {
    setEnableTranslation(enabled);
    if (enabled) {
      props.setTargetLang(lastSelectedLang === 'original' ? 'zh-CN' : lastSelectedLang);
    } else {
      setLastSelectedLang(props.targetLang);
      props.setTargetLang('original');
    }
  };

  const handleAutoGlossary = async () => {
     if (!props.detectedMeta?.fandom) return;
     setIsGeneratingGlossary(true);
     try {
         const result = await generateFandomGlossary(props.detectedMeta.fandom, props.targetLang, props.selectedModel);
         if (result) {
             props.setGlossary(result);
         } else {
             alert("Glossary generation failed. Please check your API Quota or try a different model.");
         }
     } catch (e) {
         alert("Glossary generation error.");
     } finally {
         setIsGeneratingGlossary(false);
     }
  };

  return (
    <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 overflow-hidden ring-1 ring-gray-900/5 transition-colors">
        
        {/* Header */}
        <div className="bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-[#1a1a1a] px-8 py-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <h2 className="font-serif text-gray-900 dark:text-gray-100 font-bold text-2xl tracking-tight">{t.newTranslation}</h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700 shadow-inner">
            {[
              { id: 'file', label: t.file, icon: Upload },
              { id: 'text', label: t.paste, icon: FileText },
              { id: 'url', label: t.url, icon: LinkIcon }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => props.setInputType(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${props.inputType === tab.id ? 'bg-white dark:bg-gray-700 text-[#990000] dark:text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-8 space-y-8">
          {/* Input Area */}
          {props.inputType === 'file' && (
            <div className="relative group">
              <input type="file" id="file-upload" className="hidden" accept=".html,.htm,.txt" onChange={props.handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-5 p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/30 dark:bg-gray-900/10 hover:bg-red-50/20 dark:hover:bg-red-900/5 hover:border-red-200 dark:hover:border-red-900 transition-all duration-300 group-hover:shadow-inner">
                <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-[#990000] dark:text-red-500" />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-gray-900 dark:text-gray-100 font-bold text-xl line-clamp-1">
                    {props.detectedMeta ? props.detectedMeta.title : (props.inputFile ? props.inputFile.name : t.uploadPlaceholder)}
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {props.detectedMeta ? `Detected: ${props.detectedMeta.tags.length} tags, ${props.detectedMeta.fandom}` : t.supportedFormats}
                  </p>
                </div>
              </label>
            </div>
          )}

          {props.inputType === 'text' && (
            <textarea 
              className="w-full h-64 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border rounded-2xl p-5 focus:ring-4 focus:ring-[#990000]/5 focus:border-[#990000] outline-none font-serif text-lg leading-relaxed resize-none shadow-sm transition-all"
              placeholder={t.pastePlaceholder}
              value={props.inputText}
              onChange={e => props.setInputText(e.target.value)}
            />
          )}
          
          {props.inputType === 'url' && (
            <div className="space-y-4">
              <input 
                type="text" placeholder={t.urlPlaceholder} 
                className="w-full border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border rounded-2xl p-4 focus:ring-4 focus:ring-[#990000]/5 focus:border-[#990000] outline-none shadow-sm transition-all"
                value={props.inputUrl} onChange={e => props.setInputUrl(e.target.value)}
              />
              <div className="flex gap-4 items-start p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-sm">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t.urlWarning}</p>
              </div>
            </div>
          )}

          {/* Translation Controls Divider */}
          <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-[#1a1a1a] px-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Controls</span>
              </div>
          </div>

          {/* Toggle Translation Mode */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${enableTranslation ? 'bg-[#990000] text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                      <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t.enableTranslation}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{enableTranslation ? t.poweredBy : t.readOriginal}</p>
                  </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={enableTranslation} onChange={(e) => handleToggleTranslation(e.target.checked)} />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#990000]"></div>
              </label>
          </div>

          {/* Conditional Advanced Settings */}
          {enableTranslation && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <div className="p-5 space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <Languages className="w-3.5 h-3.5" /> {t.targetLang}
                    </label>
                    <select 
                        value={props.targetLang} onChange={(e) => props.setTargetLang(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none shadow-sm"
                    >
                        {SUPPORTED_LANGUAGES.filter(l => l.code !== 'original').map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                    </select>
                    </div>
                    <div className="p-5 space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5" /> {t.aiModel}
                    </label>
                    <select 
                        value={props.selectedModel} onChange={(e) => props.setSelectedModel(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none shadow-sm"
                    >
                        {AVAILABLE_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                    </select>
                    </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <button 
                    onClick={() => props.setShowSettings(!props.showSettings)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#990000] dark:hover:text-red-400 transition-colors w-full justify-between px-2"
                    title={t.advancedSettings}
                    >
                    <span className="flex items-center gap-2">
                        <Sliders className="w-4 h-4" /> {t.advancedSettings}
                        {props.detectedMeta && props.detectedMeta.tags.length > 0 && <span className="bg-red-50 dark:bg-red-900/20 text-[#990000] dark:text-red-400 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/50">{props.detectedMeta.tags.length} Tags</span>}
                    </span>
                    {props.showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {props.showSettings && (
                        <div className="mt-6 p-6 bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-3xl space-y-8 animate-in fade-in slide-in-from-top-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.batchSize}</label>
                                <span className="text-xs font-mono font-bold text-[#990000] dark:text-red-400">{props.batchSize} {t.blocks}</span>
                                </div>
                                <input type="range" min="1" max="20" value={props.batchSize} onChange={(e) => props.setBatchSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000] dark:accent-red-600" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.contextWindow}</label>
                                <span className="text-xs font-mono font-bold text-[#990000] dark:text-red-400">{t.prev} {props.contextWindow} {t.blocks}</span>
                                </div>
                                <input type="range" min="0" max="10" value={props.contextWindow} onChange={(e) => props.setContextWindow(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000] dark:accent-red-600" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                <input type="checkbox" id="includeTags" checked={props.includeTags} onChange={(e) => props.setIncludeTags(e.target.checked)} className="w-5 h-5 text-[#990000] border-gray-300 dark:border-gray-700 rounded-lg focus:ring-0" />
                                <label htmlFor="includeTags" className="text-xs font-bold text-gray-500 uppercase tracking-wide select-none cursor-pointer">{t.includeTags}</label>
                                </div>
                                {props.includeTags && props.detectedMeta && props.detectedMeta.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl max-h-40 overflow-y-auto">
                                    {props.detectedMeta.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-[10px] font-bold bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                                        {tag} <button onClick={() => props.onRemoveTag(tag)} className="hover:text-red-600"><X className="w-3 h-3"/></button>
                                    </span>
                                    ))}
                                </div>
                                )}
                            </div>
                            </div>
                            <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.systemPrompt}</label>
                                <button onClick={props.onRestorePrompt} className="text-[10px] text-[#990000] hover:underline font-bold" title={t.restorePrompt}>{t.restorePrompt}</button>
                                </div>
                                <textarea value={props.customPrompt} onChange={(e) => props.setCustomPrompt(e.target.value)} className="w-full text-xs p-4 border border-gray-200 dark:border-gray-700 rounded-2xl h-28 bg-white dark:bg-gray-800 dark:text-gray-200 outline-none resize-none focus:border-[#990000]" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.glossary}</label>
                                    {props.detectedMeta?.fandom && (
                                        <button 
                                            onClick={handleAutoGlossary} 
                                            disabled={isGeneratingGlossary}
                                            className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold disabled:opacity-50"
                                            title={t.autoGlossaryTooltip}
                                        >
                                            {isGeneratingGlossary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {isGeneratingGlossary ? t.generating : t.autoGlossary}
                                        </button>
                                    )}
                                </div>
                                <textarea value={props.glossary} onChange={(e) => props.setGlossary(e.target.value)} placeholder={t.glossaryPlaceholder} className="w-full text-xs p-4 border border-gray-200 dark:border-gray-700 rounded-2xl h-28 bg-white dark:bg-gray-800 dark:text-gray-200 outline-none resize-none focus:border-[#990000]" />
                            </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* Action Button */}
          <button 
            onClick={props.onStart} disabled={props.isProcessing}
            className={`h-16 w-full rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-red-900/10 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${props.isProcessing ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-white' : enableTranslation ? 'bg-gradient-to-r from-[#990000] to-[#cc0000] text-white hover:shadow-red-900/20' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:shadow-lg'}`}
          >
            {props.isProcessing ? <Loader2 className="animate-spin w-6 h-6"/> : enableTranslation ? <ArrowRight className="w-6 h-6"/> : <BookOpen className="w-6 h-6"/>}
            {props.isProcessing ? t.translating : enableTranslation ? t.start : t.startReading}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationInput;
