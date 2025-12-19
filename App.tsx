import React, { useState, useEffect, useRef } from 'react';
import { TranslationProject, TranslationBlock, DisplayMode, SUPPORTED_LANGUAGES, AVAILABLE_MODELS, FicMetadata, DEFAULT_PROMPT, DEFAULT_REFINE_PROMPT } from './types';
import { identifyFandom, translateBatch } from './services/geminiService';
import { splitTextIntoBlocks, generateId, exportTranslation, parseUploadedFile, sanitizeProjectData } from './services/utils';
import { Layout, Menu, Download, Globe, Languages, Settings as SettingsIcon, History as HistoryIcon, ArrowRight, Loader2, Upload, FileText, Link as LinkIcon, AlertCircle, Cpu, Sliders, ChevronDown, ChevronUp, Book, Tag, Pause, Play, X, Sparkles, Save, Heart } from 'lucide-react';
import TranslationReader from './components/TranslationReader';
import HistorySidebar from './components/HistorySidebar';
import FavoritesPage from './components/FavoritesPage';
import { UI_STRINGS, LanguageCode } from './services/i18n';

const App: React.FC = () => {
  // UI Language State
  const [uiLang, setUiLang] = useState<LanguageCode>('zh'); 
  const t = UI_STRINGS[uiLang];

  // State
  const [inputUrl, setInputUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'url' | 'text' | 'file'>('file');
  
  // Pre-analysis Metadata State (New)
  const [detectedMeta, setDetectedMeta] = useState<{
    title: string;
    author: string;
    fandom: string;
    tags: string[];
    blocks: TranslationBlock[];
  } | null>(null);

  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [history, setHistory] = useState<TranslationProject[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.TRANSLATED_ONLY);
  const [targetLang, setTargetLang] = useState('zh-CN');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  
  // Advanced Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false); // New modal state
  
  const [batchSize, setBatchSize] = useState(5);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [refinePromptTemplate, setRefinePromptTemplate] = useState(DEFAULT_REFINE_PROMPT);
  const [contextWindow, setContextWindow] = useState(2); 
  const [includeTags, setIncludeTags] = useState(true);
  const [tagInstruction, setTagInstruction] = useState('Use tags to understand context; translate only if they appear in text.');
  const [glossary, setGlossary] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const stopProcessingRef = useRef(false);

  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load history with sanitization
  useEffect(() => {
    const saved = localStorage.getItem('ao3_translator_history');
    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved) as TranslationProject[];
        // Sanitize imported data: reset stuck loading states
        const cleanedHistory = parsedHistory.map(sanitizeProjectData);
        setHistory(cleanedHistory);
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ao3_translator_history', JSON.stringify(history));
  }, [history]);

  // Sync progress and Settings when project changes/loads
  useEffect(() => {
    if (currentProject) {
      const total = currentProject.blocks.length;
      const current = currentProject.blocks.filter(b => b.translated).length;
      setProgress({ current, total });

      // Sync settings from project to local state so "Resume" uses correct settings
      // and the settings modal shows current project values
      if (currentProject.metadata.model) setSelectedModel(currentProject.metadata.model);
      if (currentProject.metadata.customPrompt) setCustomPrompt(currentProject.metadata.customPrompt);
      if (currentProject.metadata.refinePromptTemplate) setRefinePromptTemplate(currentProject.metadata.refinePromptTemplate);
      if (currentProject.metadata.batchSize !== undefined) setBatchSize(currentProject.metadata.batchSize || 5); 
      if (currentProject.metadata.contextWindow !== undefined) setContextWindow(currentProject.metadata.contextWindow);
      if (currentProject.metadata.glossary) setGlossary(currentProject.metadata.glossary);
      if (currentProject.metadata.includeTags !== undefined) setIncludeTags(currentProject.metadata.includeTags);
      if (currentProject.metadata.tagInstruction) setTagInstruction(currentProject.metadata.tagInstruction);
      if (currentProject.metadata.targetLanguage) setTargetLang(currentProject.metadata.targetLanguage);

    } else {
      setProgress({ current: 0, total: 0 });
    }
  }, [currentProject]);

  const generateSmartPrompt = (meta: { title: string, author: string, fandom: string, tags: string[] }) => {
    let p = `You are a professional literary translator specializing in Fanfiction.`;
    
    p += `\n\nMetadata Context:`;
    p += `\n- Title: ${meta.title}`;
    p += `\n- Author: ${meta.author}`;
    p += `\n- Fandom: ${meta.fandom}`;
    
    if (meta.tags.length > 0) {
        // Limit tags to avoid context window explosion, though usually tags are short.
        p += `\n- Tags: ${meta.tags.slice(0, 20).join(', ')}`; 
    }

    p += `\n\nDirectives:`;
    p += `\n1. Maintain the character's unique voice and the specific tone of the ${meta.fandom} fandom.`;
    p += `\n2. Translate with literary quality, prioritizing narrative flow and emotional resonance.`;
    p += `\n3. Use specific fandom terminology correctly in the target language.`;
    p += `\n4. Optimize typography for reading comfort.`;
    
    return p;
  };

  // Handle File Upload & Immediate Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setInputFile(file);
      
      // Immediate Parsing
      try {
        const parsed = await parseUploadedFile(file);
        setDetectedMeta({
            title: parsed.title,
            author: parsed.author,
            fandom: parsed.fandom,
            tags: parsed.tags,
            blocks: parsed.blocks
        });
        
        // Auto-generate prompt based on extracted metadata
        const smartPrompt = generateSmartPrompt(parsed);
        setCustomPrompt(smartPrompt);

        // Auto-expand settings if tags are found to let user see them
        if (parsed.tags.length > 0) {
            setShowSettings(true);
        }
      } catch (error) {
          console.error("Error parsing file preview", error);
      }
    }
  };

  const handleStop = () => {
      stopProcessingRef.current = true;
      setIsProcessing(false);
  };

  const removeTag = (tagToRemove: string) => {
      if (detectedMeta) {
          setDetectedMeta({
              ...detectedMeta,
              tags: detectedMeta.tags.filter(t => t !== tagToRemove)
          });
      }
  };

  const restoreDefaultPrompt = () => {
      if (currentProject) {
         const smartPrompt = generateSmartPrompt({
             title: currentProject.metadata.title,
             author: currentProject.metadata.author,
             fandom: currentProject.metadata.fandom,
             tags: currentProject.metadata.tags || []
         });
         setCustomPrompt(smartPrompt);
         setRefinePromptTemplate(DEFAULT_REFINE_PROMPT);
      } else if (detectedMeta) {
          setCustomPrompt(generateSmartPrompt(detectedMeta));
      } else {
          setCustomPrompt(DEFAULT_PROMPT);
          setRefinePromptTemplate(DEFAULT_REFINE_PROMPT);
      }
  };

  // Update current project metadata when settings change in the modal
  const saveProjectSettings = () => {
      if (!currentProject) return;
      const updatedProject = {
          ...currentProject,
          metadata: {
              ...currentProject.metadata,
              model: selectedModel,
              customPrompt,
              refinePromptTemplate,
              contextWindow,
              batchSize,
              includeTags,
              tagInstruction,
              glossary,
              targetLanguage: targetLang
          },
          lastModified: Date.now()
      };
      setCurrentProject(updatedProject);
      setHistory(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setShowProjectSettingsModal(false);
  };

  // Handle Start Translation
  const handleStart = async () => {
    stopProcessingRef.current = false;
    
    let blocks: TranslationBlock[] = [];
    let title = "Untitled Fic";
    let author = "Unknown";
    let fandom = "Unknown"; 
    let tags: string[] = [];
    let projectToUse: TranslationProject;

    try {
      const isResuming = currentProject !== null && currentProject.blocks.length > 0;

      if (isResuming && currentProject) {
          // IMPORTANT: Update metadata with currently selected UI settings
          projectToUse = {
              ...currentProject,
              metadata: {
                  ...currentProject.metadata,
                  model: selectedModel,
                  customPrompt: customPrompt,
                  refinePromptTemplate: refinePromptTemplate,
                  contextWindow: contextWindow,
                  batchSize: batchSize,
                  includeTags: includeTags,
                  tagInstruction: tagInstruction,
                  glossary: glossary,
                  targetLanguage: targetLang
              }
          };
          blocks = currentProject.blocks;
      } else {
           // --- NEW PROJECT SETUP ---
           setIsProcessing(true);
           
           if (inputType === 'file' && inputFile) {
              if (detectedMeta) {
                  blocks = detectedMeta.blocks;
                  title = detectedMeta.title;
                  author = detectedMeta.author;
                  fandom = detectedMeta.fandom;
                  tags = detectedMeta.tags;
              } else {
                  const parsed = await parseUploadedFile(inputFile);
                  blocks = parsed.blocks;
                  title = parsed.title;
                  author = parsed.author;
                  fandom = parsed.fandom;
                  tags = parsed.tags;
              }
           } else if (inputType === 'url') {
             if (!inputUrl) { setIsProcessing(false); return; }
             alert(t.urlWarning);
             setIsProcessing(false);
             return;
           } else {
              if (!inputText) { setIsProcessing(false); return; }
              const lines = inputText.split('\n').slice(0, 5);
              title = lines[0]?.length < 50 ? lines[0] : "Pasted Fanfic";
              blocks = splitTextIntoBlocks(inputText);
           }

           if (blocks.length === 0) {
            alert("No content found.");
            setIsProcessing(false);
            return;
           }

           // Identify Fandom (if not already found in file)
           if (fandom === "Unknown" || fandom === "Unknown Fandom") {
              const sampleText = blocks.slice(0, 3).map(b => b.original).join('\n');
              fandom = await identifyFandom(sampleText, selectedModel);
           }
          
          projectToUse = {
            id: generateId(),
            metadata: {
              title, author, fandom, tags,
              originalLanguage: 'auto',
              targetLanguage: targetLang,
              model: selectedModel,
              customPrompt, refinePromptTemplate, contextWindow, batchSize, includeTags, tagInstruction, glossary,
              date: new Date().toISOString(),
              url: inputUrl
            },
            blocks: blocks,
            lastModified: Date.now(),
          };
          // Immediately set current project so user sees it while processing
          setCurrentProject(projectToUse);
      }

      setIsProcessing(true);
      setProgress({ current: 0, total: blocks.length });

      // --- TRANSLATION LOOP ---
      const BATCH_SIZE = Math.max(1, Math.min(20, batchSize));
      const originalBlocks = [...projectToUse.blocks]; 
      const translatedBlocks = [...projectToUse.blocks]; 
      const contextBuffer: string[] = [];

      let translatedCount = 0;
      translatedBlocks.forEach(b => { if(b.translated) translatedCount++; });
      setProgress({ current: translatedCount, total: blocks.length });

      for (let i = 0; i < originalBlocks.length; i += BATCH_SIZE) {
        if (stopProcessingRef.current) break;

        const batchIndices: number[] = [];
        const batchTexts: string[] = [];
        const currentBatchSlice = originalBlocks.slice(i, i + BATCH_SIZE);
        
        const needsTranslation = currentBatchSlice.some((b, idx) => !translatedBlocks[i + idx].translated);

        if (!needsTranslation) {
             currentBatchSlice.forEach(b => {
                 contextBuffer.push(b.original);
                 if (contextBuffer.length > contextWindow) contextBuffer.shift();
             });
             continue;
        }

        currentBatchSlice.forEach((b, idx) => {
            if (!translatedBlocks[i + idx].translated) {
                batchIndices.push(i + idx);
                batchTexts.push(b.original);
                translatedBlocks[i + idx].isLoading = true;
            }
        });

        if (batchTexts.length === 0) continue;

        setCurrentProject({ ...projectToUse, blocks: [...translatedBlocks] });

        const previousContext = contextBuffer.join('\n');
        
        try {
            const translations = await translateBatch(
              batchTexts, 
              targetLang, 
              projectToUse.metadata.fandom, 
              {
                 model: projectToUse.metadata.model, // Use the potentially updated model
                 customPrompt: projectToUse.metadata.customPrompt || "",
                 previousContext,
                 tags: includeTags ? tags : [],
                 tagInstruction,
                 glossary
              }
            );
            
            batchIndices.forEach((realIdx, mapIdx) => {
                if (translatedBlocks[realIdx]) {
                    translatedBlocks[realIdx].translated = translations[mapIdx] || "Error";
                    translatedBlocks[realIdx].isLoading = false;
                }
            });
        } catch (err) {
            console.error(err);
             batchIndices.forEach((realIdx) => {
                if (translatedBlocks[realIdx]) translatedBlocks[realIdx].isLoading = false;
            });
        }

        currentBatchSlice.forEach(b => {
             contextBuffer.push(b.original);
             if (contextBuffer.length > contextWindow) contextBuffer.shift();
        });
        
        const updatedProject = { ...projectToUse, blocks: [...translatedBlocks], lastModified: Date.now() };
        setCurrentProject(updatedProject);
        
        setHistory(prev => {
           const existing = prev.filter(p => p.id !== updatedProject.id);
           return [updatedProject, ...existing];
        });

        const doneCount = translatedBlocks.filter(b => b.translated).length;
        setProgress({ current: doneCount, total: blocks.length });
      }

    } catch (e) {
      console.error(e);
      alert(t.errorGeneric);
    } finally {
      setIsProcessing(false);
      stopProcessingRef.current = false;
    }
  };

  const handleUpdateBlock = (blockId: string, newText: string) => {
    // USE FUNCTIONAL UPDATE to avoid race conditions/stale closures during async refinement
    setCurrentProject((prevProject) => {
        if (!prevProject) return null;
        
        const updatedBlocks = prevProject.blocks.map(b => 
          // Explicitly set isLoading to false here to ensure completion state is captured even if race occurs
          b.id === blockId ? { ...b, translated: newText, isEdited: true, isLoading: false } : b
        );
        
        const updatedProject = { ...prevProject, blocks: updatedBlocks, lastModified: Date.now() };
        
        // Side effect: update history with the new project state
        setHistory(prevHistory => prevHistory.map(p => p.id === updatedProject.id ? updatedProject : p));
        
        return updatedProject;
    });
  };

  const handleBlockLoading = (blockId: string, loading: boolean) => {
    // USE FUNCTIONAL UPDATE to ensure we don't overwrite text updates
    setCurrentProject((prevProject) => {
        if (!prevProject) return null;
        const updatedBlocks = prevProject.blocks.map(b => 
            b.id === blockId ? { ...b, isLoading: loading } : b
        );
        return { ...prevProject, blocks: updatedBlocks };
    });
  };

  const handleToggleFavorite = (projectId: string, blockId: string) => {
      // Helper to toggle favorite across history
      const updateList = (prevHistory: TranslationProject[]) => {
          return prevHistory.map(p => {
              if (p.id !== projectId) return p;
              const newBlocks = p.blocks.map(b => 
                  b.id === blockId ? { ...b, isFavorite: !b.isFavorite } : b
              );
              return { ...p, blocks: newBlocks, lastModified: Date.now() };
          });
      };
      
      setHistory(prev => {
          const newHistory = updateList(prev);
          
          // Also update current project if it matches (using functional update on currentProject for safety)
          setCurrentProject(curr => {
              if (curr && curr.id === projectId) {
                  const updatedFromHistory = newHistory.find(p => p.id === projectId);
                  return updatedFromHistory || curr;
              }
              return curr;
          });
          
          return newHistory;
      });
  };

  // Simplified wrapper for current project
  const handleCurrentProjectToggleFavorite = (blockId: string) => {
      if (currentProject) handleToggleFavorite(currentProject.id, blockId);
  };

  const handleUpdateNote = (projectId: string, blockId: string, note: string) => {
      const updateList = (prevHistory: TranslationProject[]) => {
          return prevHistory.map(p => {
              if (p.id !== projectId) return p;
              const newBlocks = p.blocks.map(b => 
                  b.id === blockId ? { ...b, note: note } : b
              );
              return { ...p, blocks: newBlocks, lastModified: Date.now() };
          });
      };
      setHistory(prev => {
          const newHistory = updateList(prev);
          setCurrentProject(curr => {
              if (curr && curr.id === projectId) {
                  const updatedFromHistory = newHistory.find(p => p.id === projectId);
                  return updatedFromHistory || curr;
              }
              return curr;
          });
          return newHistory;
      });
  };
  
  const handleCurrentProjectUpdateNote = (blockId: string, note: string) => {
      if (currentProject) handleUpdateNote(currentProject.id, blockId, note);
  };

  const handleSetBookmark = (blockId: string) => {
      setCurrentProject(prev => {
          if (!prev) return null;
          const updatedProject = { ...prev, bookmarkBlockId: blockId, lastModified: Date.now() };
          setHistory(h => h.map(p => p.id === updatedProject.id ? updatedProject : p));
          return updatedProject;
      });
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) setCurrentProject(null);
  };
  
  const clearHistory = () => {
      if(window.confirm(t.confirmClear)) {
          setHistory([]);
          setCurrentProject(null);
      }
  };

  // Navigate to specific project and block from Favorites
  const handleNavigateFromFavorites = (projectId: string, blockId: string) => {
      const targetProject = history.find(p => p.id === projectId);
      if (targetProject) {
          // Set current project
          // Sanitize it just in case
          setCurrentProject(sanitizeProjectData({ ...targetProject, bookmarkBlockId: blockId }));
          setShowFavorites(false);
      }
  };

  // Import/Export History Logic (Unified Backup)
  const exportHistory = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", "ao3_translator_data_backup.json"); // Updated filename
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if(e.target.files && e.target.files[0]) {
          fileReader.readAsText(e.target.files[0], "UTF-8");
          fileReader.onload = (event) => {
              try {
                  const imported = JSON.parse(event.target?.result as string);
                  if(Array.isArray(imported)) {
                      const valid = imported.every(i => i.id && i.blocks && i.metadata);
                      if(valid) {
                          setHistory(prev => {
                              const existingIds = new Set(prev.map(p => p.id));
                              // Sanitize data on import to fix "stuck" loading blocks
                              const newItems = (imported as TranslationProject[])
                                .filter(p => !existingIds.has(p.id))
                                .map(sanitizeProjectData);
                              return [...newItems, ...prev];
                          });
                      } else {
                          alert(t.errorImport);
                      }
                  }
              } catch (err) {
                  alert(t.errorImport);
              }
          };
      }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-800 font-sans selection:bg-red-100 selection:text-red-900">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 border-b border-gray-200 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setCurrentProject(null); setShowFavorites(false); }}>
            <div className="bg-[#990000] text-white p-1.5 px-2 rounded font-serif font-bold text-lg tracking-tighter group-hover:bg-[#800000] transition-colors shadow-sm">AO3</div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-gray-900 text-lg leading-none tracking-tight">{t.appTitle}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{t.poweredBy}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group flex items-center">
                 <Globe className="w-4 h-4 text-gray-400 mr-1" />
                 <select 
                    value={uiLang} 
                    onChange={(e) => setUiLang(e.target.value as LanguageCode)}
                    className="bg-transparent text-xs font-semibold text-gray-600 outline-none cursor-pointer hover:text-[#990000]"
                 >
                     <option value="en">English</option>
                     <option value="zh">中文</option>
                     <option value="ja">日本語</option>
                 </select>
            </div>

             {/* Favorites Button */}
             <button 
                onClick={() => setShowFavorites(!showFavorites)} 
                className={`p-2 rounded-full relative transition-colors ${showFavorites ? 'text-[#990000] bg-red-50' : 'text-gray-500 hover:bg-gray-100 hover:text-[#990000]'}`}
                title={t.favorites}
             >
                <Heart className={`w-5 h-5 ${showFavorites ? 'fill-current' : ''}`} />
             </button>

             {/* Display Modes (Only when in project and not in favorites view) */}
             {currentProject && !showFavorites && (
                 <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                    <button 
                         onClick={() => setDisplayMode(DisplayMode.TRANSLATED_ONLY)}
                         className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${displayMode === DisplayMode.TRANSLATED_ONLY ? 'bg-white shadow text-[#990000]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.displayTranslated}
                    </button>
                    <button 
                        onClick={() => setDisplayMode(DisplayMode.SIDE_BY_SIDE)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${displayMode === DisplayMode.SIDE_BY_SIDE ? 'bg-white shadow text-[#990000]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.displaySideBySide}
                    </button>
                    <button 
                        onClick={() => setDisplayMode(DisplayMode.INTERLINEAR)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${displayMode === DisplayMode.INTERLINEAR ? 'bg-white shadow text-[#990000]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.displayInterlinear}
                    </button>
                 </div>
             )}

            <button onClick={() => setHistoryOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors hover:text-[#990000]">
               <HistoryIcon className="w-5 h-5" />
               {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#990000] border border-white rounded-full"></span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW LOGIC */}
        {showFavorites ? (
            <FavoritesPage 
                history={history}
                lang={uiLang}
                onNavigateToProject={handleNavigateFromFavorites}
                onUpdateNote={handleUpdateNote}
                onRemoveFavorite={handleToggleFavorite}
                onExportBackup={exportHistory} // Use the main history export
                onClose={() => setShowFavorites(false)}
            />
        ) : (
            <>
                {/* SETTINGS MODAL (In-Project) */}
                {showProjectSettingsModal && currentProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                    <SettingsIcon className="w-5 h-5 text-[#990000]" />
                                    {t.settings}
                                </h3>
                                <button onClick={() => setShowProjectSettingsModal(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* Core Settings */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            <Sparkles className="w-3.5 h-3.5" /> {t.aiModel}
                                        </label>
                                        <select 
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000]"
                                        >
                                            {AVAILABLE_MODELS.map(model => (
                                                <option key={model.id} value={model.id}>{model.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            <Languages className="w-3.5 h-3.5" /> {t.targetLang}
                                        </label>
                                        <select 
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000]"
                                        >
                                            {SUPPORTED_LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Batch & Context */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.batchSize}</label>
                                            <span className="text-xs bg-white border px-2 rounded">{batchSize}</span>
                                        </div>
                                        <input type="range" min="1" max="20" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.contextWindow}</label>
                                            <span className="text-xs bg-white border px-2 rounded">{contextWindow}</span>
                                        </div>
                                        <input type="range" min="0" max="10" value={contextWindow} onChange={(e) => setContextWindow(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#990000]" />
                                    </div>
                                </div>

                                {/* Prompt & Glossary */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t.systemPrompt}</label>
                                        <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="w-full text-xs p-3 border border-gray-300 rounded-lg h-32 bg-white text-gray-800 shadow-sm leading-relaxed focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none" />
                                        <div className="flex justify-end mt-1">
                                            <button onClick={restoreDefaultPrompt} className="text-[10px] text-[#990000] hover:underline font-medium">{t.restorePrompt}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fix / Refine Prompt Template</label>
                                        <p className="text-[10px] text-gray-400 mb-1">Available vars: {`{{original}}, {{translated}}, {{targetLang}}, {{fandom}}, {{instruction}}`}</p>
                                        <textarea 
                                            value={refinePromptTemplate}
                                            onChange={(e) => setRefinePromptTemplate(e.target.value)}
                                            className="w-full text-xs p-3 border border-gray-300 rounded-lg h-24 bg-white text-gray-800 shadow-sm leading-relaxed focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t.glossary}</label>
                                        <textarea value={glossary} onChange={(e) => setGlossary(e.target.value)} placeholder={t.glossaryPlaceholder} className="w-full text-xs p-3 border border-gray-300 rounded-lg h-24 bg-white text-gray-800 shadow-sm leading-relaxed focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setShowProjectSettingsModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">{t.pause}</button>
                                <button onClick={saveProjectSettings} className="px-6 py-2 bg-[#990000] text-white text-sm font-bold rounded-lg hover:bg-[#800000] shadow-md shadow-red-900/10 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Section */}
                {!currentProject && (
                    <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden ring-1 ring-gray-900/5">
                        
                        {/* Card Header */}
                        <div className="bg-gradient-to-b from-gray-50 to-white px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="font-serif text-gray-900 font-bold text-2xl tracking-tight">{t.newTranslation}</h2>
                            
                            {/* Tab Selector */}
                            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                                {[
                                { id: 'file', label: t.file, icon: Upload },
                                { id: 'text', label: t.paste, icon: FileText },
                                { id: 'url', label: t.url, icon: LinkIcon }
                                ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => { setInputType(tab.id as any); setDetectedMeta(null); setInputFile(null); }}
                                    className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${inputType === tab.id ? 'bg-white text-[#990000] shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            {/* FILE INPUT */}
                            {inputType === 'file' && (
                            <div className="relative group">
                                <input 
                                type="file" 
                                id="file-upload" 
                                className="hidden" 
                                accept=".html,.htm,.txt" 
                                onChange={handleFileChange}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4 p-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-red-50/30 hover:border-red-200 transition-all duration-300 group-hover:shadow-sm">
                                <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-gray-100 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-8 h-8 text-[#990000]" />
                                </div>
                                <div className="text-center space-y-1">
                                    <div className="text-gray-900 font-semibold text-lg">
                                    {detectedMeta ? detectedMeta.title : (inputFile ? inputFile.name : t.uploadPlaceholder)}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        {detectedMeta ? `Detected: ${detectedMeta.tags.length} tags, ${detectedMeta.fandom}` : t.supportedFormats}
                                    </p>
                                </div>
                                </label>
                            </div>
                            )}

                            {/* TEXT INPUT */}
                            {inputType === 'text' && (
                                <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Content</label>
                                <textarea 
                                    className="w-full h-56 border-gray-200 border rounded-xl p-4 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none font-serif text-base leading-relaxed resize-none shadow-sm transition-all"
                                    placeholder={t.pastePlaceholder}
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                />
                                </div>
                            )}
                            
                            {/* URL INPUT */}
                            {inputType === 'url' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.url}</label>
                                    <input 
                                        type="text" 
                                        placeholder={t.urlPlaceholder} 
                                        className="w-full border-gray-200 border rounded-xl p-3 focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none shadow-sm transition-all text-gray-700"
                                        value={inputUrl}
                                        onChange={e => setInputUrl(e.target.value)}
                                    />
                                    <div className="flex gap-3 items-start p-4 rounded-lg bg-orange-50 border border-orange-100 text-orange-800 text-sm">
                                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                        <p>{t.urlWarning}</p>
                                    </div>
                                </div>
                            )}

                            {/* CORE CONFIGURATION ROW */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                {/* Target Language */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        <Languages className="w-3.5 h-3.5" />
                                        {t.targetLang}
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value)}
                                            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 px-3 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000]"
                                        >
                                            {SUPPORTED_LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* AI Model */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {t.aiModel}
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 px-3 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000]"
                                        >
                                            {AVAILABLE_MODELS.map(model => (
                                                <option key={model.id} value={model.id}>{model.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* SETTINGS TOGGLE */}
                            <div className="border-t border-gray-100 pt-6">
                                <button 
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#990000] transition-colors group w-full justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <Sliders className="w-4 h-4" />
                                        {t.advancedSettings}
                                        {detectedMeta && detectedMeta.tags.length > 0 && <span className="bg-red-100 text-[#990000] text-[10px] px-2 py-0.5 rounded-full">{detectedMeta.tags.length} Tags Detected</span>}
                                    </span>
                                    {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                
                                {showSettings && (
                                    <div className="mt-4 p-5 bg-gray-50/80 border border-gray-200 rounded-xl space-y-6 animate-in fade-in slide-in-from-top-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left Column */}
                                        <div className="space-y-5">
                                            {/* Batch Size */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                        {t.batchSize}
                                                    </label>
                                                    <span className="text-xs font-medium px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                                                        {batchSize} {t.blocks}
                                                    </span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="20" 
                                                    value={batchSize} 
                                                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#990000] hover:accent-red-700"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1.5">{t.batchSizeDesc}</p>
                                            </div>

                                            {/* Context Window */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                        {t.contextWindow}
                                                    </label>
                                                    <span className="text-xs font-medium px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                                                        {t.prev} {contextWindow} {t.blocks}
                                                    </span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="10" 
                                                    value={contextWindow} 
                                                    onChange={(e) => setContextWindow(parseInt(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#990000] hover:accent-red-700"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1.5">{t.contextWindowDesc}</p>
                                            </div>

                                            {/* Tags Config */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="checkbox" 
                                                        id="includeTags"
                                                        checked={includeTags} 
                                                        onChange={(e) => setIncludeTags(e.target.checked)}
                                                        className="w-4 h-4 text-[#990000] border-gray-300 rounded focus:ring-[#990000]"
                                                    />
                                                    <label htmlFor="includeTags" className="text-xs font-bold text-gray-500 uppercase tracking-wide select-none cursor-pointer">
                                                        {t.includeTags}
                                                    </label>
                                                </div>
                                                
                                                {includeTags && detectedMeta && detectedMeta.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                                                        {detectedMeta.tags.map(tag => (
                                                            <span key={tag} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                                                                {tag}
                                                                <button onClick={() => removeTag(tag)} className="hover:text-red-600"><X className="w-3 h-3"/></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {includeTags && (
                                                    <input 
                                                        type="text" 
                                                        value={tagInstruction}
                                                        onChange={(e) => setTagInstruction(e.target.value)}
                                                        placeholder="Instructions for tags..."
                                                        className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#990000] outline-none"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-5">
                                            {/* System Prompt */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                                    {t.systemPrompt}
                                                </label>
                                                <textarea 
                                                    value={customPrompt}
                                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                                    className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none h-24 bg-white text-gray-800 shadow-sm leading-relaxed"
                                                />
                                                <button onClick={restoreDefaultPrompt} className="text-[10px] text-[#990000] hover:underline mt-1 font-medium">
                                                    {t.restorePrompt}
                                                </button>
                                            </div>

                                            {/* Glossary */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                                    {t.glossary}
                                                </label>
                                                <textarea 
                                                    value={glossary}
                                                    onChange={(e) => setGlossary(e.target.value)}
                                                    placeholder={t.glossaryPlaceholder}
                                                    className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000]/10 focus:border-[#990000] outline-none h-24 bg-white text-gray-800 shadow-sm leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleStart}
                                disabled={isProcessing}
                                className={`h-[52px] w-full rounded-xl font-bold text-white text-lg shadow-lg shadow-red-900/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${
                                    isProcessing 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-[#990000] to-[#b30000] hover:to-[#cc0000]'
                                }`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : <ArrowRight className="w-5 h-5"/>}
                                {isProcessing ? t.translating : t.start}
                            </button>
                        </div>
                    </div>
                    </div>
                )}

                {/* Translation View */}
                {currentProject && (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        {/* Header Info */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="text-center md:text-left">
                                <h1 className="font-serif font-bold text-xl text-gray-900 line-clamp-2">{currentProject.metadata.title}</h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-500 mt-1">
                                    <span className="font-medium text-gray-700">{t.by} {currentProject.metadata.author}</span>
                                    <span className="hidden md:inline">•</span>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{currentProject.metadata.fandom}</span>
                                </div>
                                {currentProject.metadata.tags && currentProject.metadata.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2 justify-center md:justify-start">
                                        {currentProject.metadata.tags.slice(0, 5).map((tag, i) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-500">
                                                {tag}
                                            </span>
                                        ))}
                                        {currentProject.metadata.tags.length > 5 && (
                                            <span className="text-[10px] px-1.5 py-0.5 text-gray-400">+{currentProject.metadata.tags.length - 5} more</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 justify-center items-center">
                                {/* Settings Trigger */}
                                <button 
                                    onClick={() => setShowProjectSettingsModal(true)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-[#990000] transition-colors border border-transparent hover:border-gray-200"
                                    title={t.settings}
                                >
                                    <SettingsIcon className="w-5 h-5" />
                                </button>
                                
                                <div className="w-px h-8 bg-gray-200 mx-1 hidden md:block"></div>

                                {/* Progress or Actions */}
                                
                                {/* If paused (not processing but blocks exist and not all translated) */}
                                {!isProcessing && progress.current < progress.total && progress.total > 0 && (
                                    <button onClick={handleStart} className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-bold text-green-700 border border-green-200 transition-colors">
                                        <Play className="w-4 h-4" /> {t.resume}
                                    </button>
                                )}

                                {/* If processing */}
                                {isProcessing ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium px-3 bg-blue-50 rounded-lg border border-blue-100 h-[38px]">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                                        </div>
                                        <button onClick={handleStop} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-sm font-medium text-yellow-700 border border-yellow-200 transition-colors">
                                            <Pause className="w-4 h-4" /> {t.pause}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => exportTranslation(currentProject, 'markdown')} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 transition-colors shadow-sm">
                                            <Download className="w-4 h-4" /> {t.exportMD}
                                        </button>
                                        <button onClick={() => exportTranslation(currentProject, 'html')} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 transition-colors shadow-sm">
                                            <Download className="w-4 h-4" /> {t.exportHTML}
                                        </button>
                                        <button onClick={() => setCurrentProject(null)} className="flex items-center gap-2 px-3 py-2 bg-[#990000]/5 hover:bg-[#990000]/10 rounded-lg text-sm font-medium text-[#990000] border border-[#990000]/20 transition-colors">
                                            {t.new}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <TranslationReader 
                            blocks={currentProject.blocks}
                            displayMode={displayMode}
                            fandom={currentProject.metadata.fandom}
                            targetLang={currentProject.metadata.targetLanguage}
                            model={selectedModel} /* Pass global selectedModel so fixes use current UI selection */
                            refinePromptTemplate={refinePromptTemplate || DEFAULT_REFINE_PROMPT}
                            bookmarkBlockId={currentProject.bookmarkBlockId}
                            onUpdateBlock={handleUpdateBlock}
                            onLoadingStateChange={handleBlockLoading}
                            onToggleFavorite={handleCurrentProjectToggleFavorite}
                            onSetBookmark={handleSetBookmark}
                            onUpdateNote={handleCurrentProjectUpdateNote}
                            lang={uiLang}
                        />
                    </div>
                )}
            </>
        )}
      </main>

      {/* History Sidebar */}
      <HistorySidebar 
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={(p) => {
            // Sanitize project when selected from history
            setCurrentProject(sanitizeProjectData(p));
            setHistoryOpen(false);
            setShowFavorites(false);
        }}
        onDelete={deleteHistoryItem}
        onClear={clearHistory}
        onExport={exportHistory}
        onImport={importHistory}
        lang={uiLang}
      />

    </div>
  );
};

export default App;