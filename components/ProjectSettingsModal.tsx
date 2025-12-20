
import React, { useState, useRef } from 'react';
import { X, Sliders, Sparkles, Languages, Save, FileEdit, Loader2, BookOpen, HardDrive, Type, Upload, AlertCircle } from 'lucide-react';
import { AVAILABLE_MODELS, SUPPORTED_LANGUAGES, ReadingSettings, BackupSettings } from '../types';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { generateFandomGlossary } from '../services/geminiService';
import { useTheme } from './ThemeContext';
import { useToast } from './ToastContext';

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
  readingSettings: ReadingSettings;
  setReadingSettings: (v: ReadingSettings) => void;
  backupSettings: BackupSettings;
  setBackupSettings: (v: BackupSettings) => void;
  onBackupNow: () => void;
  onRestorePrompt: () => void;
}

const ProjectSettingsModal: React.FC<SettingsProps> = ({ 
  uiLang, isOpen, onClose, onSave, settings, onRestorePrompt, fandom,
  readingSettings, setReadingSettings, backupSettings, setBackupSettings, onBackupNow
}) => {
  const t = UI_STRINGS[uiLang];
  const { theme } = useTheme(); 
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'translation' | 'reading' | 'data'>('reading');
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAutoGlossary = async () => {
    if (!fandom || fandom === 'Unknown Fandom') {
      showToast(t.errorGeneric, "error");
      return;
    }
    setIsGeneratingGlossary(true);
    try {
        const result = await generateFandomGlossary(fandom, settings.targetLang, settings.selectedModel);
        if (result) {
            const newGlossary = settings.glossary ? settings.glossary + '\n\n' + result : result;
            settings.setGlossary(newGlossary);
            showToast(t.toastGlossaryAppended, "success");
        } else {
            showToast("Glossary generation failed. Check API Quota.", "error");
        }
    } catch (e) {
        showToast("Glossary generation error.", "error");
    } finally {
        setIsGeneratingGlossary(false);
    }
  };

  const updateReading = (key: keyof ReadingSettings, value: any) => {
      setReadingSettings({ ...readingSettings, [key]: value });
  };
  const updateBackup = (key: keyof BackupSettings, value: any) => {
      setBackupSettings({ ...backupSettings, [key]: value });
  };

  // Compress image to fit in LocalStorage
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setUploadError(null);
      
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const MAX_WIDTH = 1920;
                  const MAX_HEIGHT = 1080;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                      }
                  } else {
                      if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                      
                      try {
                          setReadingSettings({ 
                              ...readingSettings, 
                              paperTheme: 'custom', 
                              customBgImage: compressedDataUrl 
                          });
                          showToast(t.toastBgUpdated, "success");
                      } catch (err) {
                          setUploadError("Image processing failed.");
                          showToast("Image too large or invalid.", "error");
                      }
                  }
              };
              img.onerror = () => setUploadError("Failed to load image.");
          };
          reader.onerror = () => setUploadError("Failed to read file.");
          reader.readAsDataURL(file);
      }
  };

  const TabButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
      <button 
         onClick={() => setActiveTab(id)}
         className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === id ? 'bg-[#990000] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'}`}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  const getPreviewBg = () => {
      if (readingSettings.paperTheme === 'custom') return 'transparent'; 
      if (theme === 'dark') {
          if (readingSettings.paperTheme === 'midnight') return '#1e293b';
          return '#1a1a1a'; 
      }
      switch(readingSettings.paperTheme) {
          case 'sepia': return '#fdfbf7';
          case 'green': return '#f0fdf4';
          case 'gray': return '#f3f4f6';
          case 'midnight': return '#1e293b';
          default: return 'white';
      }
  };

  const getPreviewColor = () => {
      if (readingSettings.paperTheme === 'custom') return theme === 'dark' ? '#e5e7eb' : '#1f2937';
      if (theme === 'dark') return '#e5e7eb'; 
      switch(readingSettings.paperTheme) {
          case 'midnight': return '#e2e8f0';
          case 'sepia': return '#5f4b32';
          case 'green': return '#14532d';
          default: return '#333';
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 transition-colors">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-2">
              <TabButton id="reading" icon={BookOpen} label={t.tabReading} />
              <TabButton id="translation" icon={Sliders} label={t.tabTranslation} />
              <TabButton id="data" icon={HardDrive} label={t.tabData} />
          </div>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#1a1a1a]">
          
          {/* --- READING TAB --- */}
          {activeTab === 'reading' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                          <Type className="w-4 h-4" /> {t.typography}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Font Controls */}
                          <div className="space-y-6">
                              <div className="space-y-4">
                                  <label className="text-xs font-bold text-gray-500 uppercase">{t.fontSize}</label>
                                  <div className="flex items-center gap-4">
                                      <input type="range" min="14" max="32" step="1" value={readingSettings.fontSize} onChange={(e) => updateReading('fontSize', parseInt(e.target.value))} className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                      <span className="w-10 text-center font-mono font-bold text-gray-700 dark:text-gray-300">{readingSettings.fontSize}px</span>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <label className="text-xs font-bold text-gray-500 uppercase">{t.lineHeight}</label>
                                  <div className="flex items-center gap-4">
                                      <input type="range" min="1.4" max="2.4" step="0.1" value={readingSettings.lineHeight} onChange={(e) => updateReading('lineHeight', parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                      <span className="w-10 text-center font-mono font-bold text-gray-700 dark:text-gray-300">{readingSettings.lineHeight}</span>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <label className="text-xs font-bold text-gray-500 uppercase">{t.blockSpacing}</label>
                                  <div className="flex items-center gap-4">
                                      <input type="range" min="10" max="60" step="2" value={readingSettings.blockSpacing || 24} onChange={(e) => updateReading('blockSpacing', parseInt(e.target.value))} className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                      <span className="w-10 text-center font-mono font-bold text-gray-700 dark:text-gray-300">{readingSettings.blockSpacing}px</span>
                                  </div>
                              </div>
                          </div>
                          {/* Theme Controls */}
                          <div className="space-y-6">
                              <div className="space-y-2">
                                   <label className="text-xs font-bold text-gray-500 uppercase">{t.fontFamily}</label>
                                   <div className="flex gap-2">
                                       <button onClick={() => updateReading('fontFamily', 'serif')} className={`flex-1 py-3 px-4 rounded-xl border font-serif text-sm transition-all ${readingSettings.fontFamily === 'serif' ? 'border-[#990000] bg-red-50 dark:bg-red-900/20 text-[#990000] dark:text-red-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{t.fontSerif}</button>
                                       <button onClick={() => updateReading('fontFamily', 'sans')} className={`flex-1 py-3 px-4 rounded-xl border font-sans text-sm transition-all ${readingSettings.fontFamily === 'sans' ? 'border-[#990000] bg-red-50 dark:bg-red-900/20 text-[#990000] dark:text-red-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{t.fontSans}</button>
                                   </div>
                              </div>
                              <div className="space-y-2">
                                   <label className="text-xs font-bold text-gray-500 uppercase">{t.paperTheme}</label>
                                   <div className="grid grid-cols-6 gap-2">
                                       {[
                                           { id: 'default', color: '#ffffff', border: '#e5e7eb', label: t.themeDefault },
                                           { id: 'sepia', color: '#fdfbf7', border: '#fde68a', label: t.themeSepia },
                                           { id: 'green', color: '#f0fdf4', border: '#86efac', label: t.themeGreen },
                                           { id: 'gray', color: '#f3f4f6', border: '#d1d5db', label: t.themeGray },
                                           { id: 'midnight', color: '#1e293b', border: '#475569', label: t.themeMidnight },
                                           { id: 'custom', color: 'transparent', border: '#999', label: t.themeCustom, icon: true }
                                       ].map((themeItem) => (
                                           <button 
                                              key={themeItem.id}
                                              onClick={() => themeItem.id === 'custom' && !readingSettings.customBgImage ? bgFileInputRef.current?.click() : updateReading('paperTheme', themeItem.id)}
                                              className={`relative h-10 w-full rounded-full border transition-all flex items-center justify-center ${readingSettings.paperTheme === themeItem.id ? 'ring-2 ring-[#990000] ring-offset-2 dark:ring-offset-[#1a1a1a]' : 'hover:scale-105'}`}
                                              style={{ backgroundColor: themeItem.id === 'custom' ? 'transparent' : themeItem.color, borderColor: themeItem.border }}
                                              title={themeItem.label}
                                           >
                                               {themeItem.icon && <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                                               {themeItem.id === 'custom' && readingSettings.paperTheme === 'custom' && readingSettings.customBgImage && (
                                                   <div className="absolute inset-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${readingSettings.customBgImage})` }}></div>
                                               )}
                                           </button>
                                       ))}
                                   </div>
                                   {readingSettings.paperTheme === 'custom' && (
                                       <div className="space-y-3 pt-2 animate-in fade-in">
                                           <button onClick={() => bgFileInputRef.current?.click()} className="text-xs font-bold text-blue-500 hover:underline block text-right w-full">{t.uploadBg}</button>
                                           
                                           {/* Opacity Control */}
                                           <div className="space-y-1">
                                               <div className="flex justify-between">
                                                   <label className="text-[10px] font-bold text-gray-500 uppercase">{t.overlayOpacity}</label>
                                                   <span className="text-[10px] font-mono">{Math.round((readingSettings.overlayOpacity ?? 0.9) * 100)}%</span>
                                               </div>
                                               <input type="range" min="0" max="1" step="0.05" value={readingSettings.overlayOpacity ?? 0.9} onChange={(e) => updateReading('overlayOpacity', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                           </div>

                                           {/* Blur Control */}
                                           <div className="space-y-1">
                                               <div className="flex justify-between">
                                                   <label className="text-[10px] font-bold text-gray-500 uppercase">{t.overlayBlur}</label>
                                                   <span className="text-[10px] font-mono">{readingSettings.overlayBlur ?? 0}px</span>
                                               </div>
                                               <input type="range" min="0" max="20" step="1" value={readingSettings.overlayBlur ?? 0} onChange={(e) => updateReading('overlayBlur', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                           </div>
                                       </div>
                                   )}
                                   {uploadError && <p className="text-[10px] text-red-500 flex items-center justify-end gap-1"><AlertCircle className="w-3 h-3"/> {uploadError}</p>}
                                   <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                              </div>
                          </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-4">{t.maxWidth}</label>
                          <input type="range" min="60" max="120" step="5" value={readingSettings.maxWidth} onChange={(e) => updateReading('maxWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                          <div className="flex justify-between text-xs text-gray-400 mt-2">
                              <span>{t.widthNarrow}</span>
                              <span>{t.widthCurrent.replace('{{val}}', readingSettings.maxWidth.toString())}</span>
                              <span>{t.widthWide}</span>
                          </div>
                      </div>
                  </div>
                  <div className="p-8 rounded-lg border transition-all duration-300 min-h-[150px] relative overflow-hidden" style={{ backgroundColor: getPreviewBg(), backgroundImage: readingSettings.paperTheme === 'custom' && readingSettings.customBgImage ? `url(${readingSettings.customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', color: getPreviewColor(), fontFamily: readingSettings.fontFamily === 'serif' ? '"Merriweather", serif' : '"Inter", sans-serif', fontSize: `${readingSettings.fontSize}px`, lineHeight: readingSettings.lineHeight, borderColor: '#e5e7eb' }}>
                      {readingSettings.paperTheme === 'custom' && (
                          <div 
                            className="absolute inset-0 transition-all duration-300"
                            style={{ 
                                backgroundColor: theme === 'dark' ? `rgba(0,0,0,${readingSettings.overlayOpacity ?? 0.9})` : `rgba(255,255,255,${readingSettings.overlayOpacity ?? 0.9})`,
                                backdropFilter: `blur(${readingSettings.overlayBlur ?? 0}px)`
                            }}
                          ></div>
                      )}
                      <div className="relative z-10">
                          <p style={{ marginBottom: `${readingSettings.blockSpacing || 24}px` }}>"The quick brown fox jumps over the lazy dog."</p>
                          <p>This is a preview of your reading settings. Adjust the controls above to find the most comfortable reading experience for your eyes.</p>
                      </div>
                  </div>
              </div>
          )}

          {/* --- TRANSLATION TAB --- */}
          {activeTab === 'translation' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Left Column: Basic Config */}
                <div className="lg:col-span-4 space-y-8">
                    {/* ... (AI Model & Lang Selectors) ... */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3" /> {t.aiModel}</label>
                            <select value={settings.selectedModel} onChange={(e) => settings.setSelectedModel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#990000]/20">
                                {AVAILABLE_MODELS.map(model => <option key={model.id} value={model.id}>{model.name.split(' (')[0]}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2"><Languages className="w-3 h-3" /> {t.targetLang}</label>
                            <select value={settings.targetLang} onChange={(e) => settings.setTargetLang(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#990000]/20">
                                {SUPPORTED_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* ... (Batch & Context Sliders) ... */}
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
                                <span className="text-xs font-mono font-bold text-[#990000] dark:text-red-400">{t.prev} {settings.contextWindow} {t.blocks}</span>
                            </div>
                            <input type="range" min="0" max="10" value={settings.contextWindow} onChange={(e) => settings.setContextWindow(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#990000] dark:accent-red-600" />
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{t.contextWindowDesc}</p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input type="checkbox" id="includeTagsModal" checked={settings.includeTags} onChange={(e) => settings.setIncludeTags(e.target.checked)} className="w-5 h-5 text-[#990000] border-gray-300 dark:border-gray-700 rounded focus:ring-0 cursor-pointer accent-[#990000]" />
                            <label htmlFor="includeTagsModal" className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer">{t.includeTags}</label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Prompts */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.systemPrompt}</label>
                            <button onClick={onRestorePrompt} className="text-[10px] text-[#990000] dark:text-red-400 hover:underline font-bold uppercase tracking-tight" title="Reset to default prompt">{t.restorePrompt}</button>
                        </div>
                        <textarea value={settings.customPrompt} onChange={(e) => settings.setCustomPrompt(e.target.value)} className="w-full text-sm p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner font-mono" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2"><FileEdit className="w-3 h-3"/> {t.refineTemplateLabel}</label>
                            <textarea value={settings.refinePromptTemplate} onChange={(e) => settings.setRefinePromptTemplate(e.target.value)} placeholder={t.refineTemplatePlaceholder} className="w-full text-xs p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner font-mono leading-relaxed" />
                            <p className="text-[10px] text-gray-400">{t.templateVars}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.glossary}</label>
                                {fandom && fandom !== 'Unknown Fandom' && (
                                    <button onClick={handleAutoGlossary} disabled={isGeneratingGlossary} className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold disabled:opacity-50 uppercase tracking-tight" title="Auto-generate glossary based on Fandom">
                                        {isGeneratingGlossary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        {isGeneratingGlossary ? t.generating : t.autoGlossary}
                                    </button>
                                )}
                            </div>
                            <textarea value={settings.glossary} onChange={(e) => settings.setGlossary(e.target.value)} placeholder={t.glossaryPlaceholder} className="w-full text-sm p-4 border border-gray-200 dark:border-gray-700 rounded-xl h-32 bg-gray-50/30 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none resize-none transition-all shadow-inner" />
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* --- DATA TAB --- */}
          {activeTab === 'data' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      {/* ... (Data Settings) ... */}
                      <div className="flex items-center gap-4 mb-6">
                          <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300"><HardDrive className="w-6 h-6" /></div>
                          <div><h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{t.autoBackup}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{t.backupDescription}</p></div>
                          <div className="ml-auto"><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={backupSettings.autoBackupEnabled} onChange={(e) => updateBackup('autoBackupEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
                      </div>
                      {backupSettings.autoBackupEnabled && (
                          <div className="space-y-4 pl-16">
                              <div className="flex items-center gap-4">
                                   <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{t.backupInterval}</label>
                                   <select value={backupSettings.backupIntervalMinutes} onChange={(e) => updateBackup('backupIntervalMinutes', parseInt(e.target.value))} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200">
                                       <option value={5}>5 {t.minutes}</option>
                                       <option value={15}>15 {t.minutes}</option>
                                       <option value={30}>30 {t.minutes}</option>
                                       <option value={60}>60 {t.minutes}</option>
                                   </select>
                              </div>
                              <p className="text-xs text-gray-500">{t.lastBackup} <span className="font-mono text-gray-800 dark:text-gray-200">{backupSettings.lastBackupTime ? new Date(backupSettings.lastBackupTime).toLocaleTimeString() : t.never}</span></p>
                              <p className="text-[10px] text-gray-400 italic">{t.backupSecurityNote}</p>
                          </div>
                      )}
                  </div>
                  <div className="flex flex-col items-center gap-4">
                      <button onClick={onBackupNow} className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"><Save className="w-4 h-4" /> {t.backupNow}</button>
                      <p className="text-xs text-gray-400 text-center max-w-sm">{t.backupNowDesc}</p>
                  </div>
              </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 transition-colors">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">{t.cancel}</button>
          <button onClick={onSave} className="px-10 py-2.5 bg-[#990000] dark:bg-[#b30000] text-white text-sm font-black rounded-xl hover:bg-[#800000] dark:hover:bg-red-800 shadow-lg shadow-red-900/10 flex items-center gap-2 transition-all active:scale-95">
             {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
