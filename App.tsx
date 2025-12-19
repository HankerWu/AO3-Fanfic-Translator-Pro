
import React, { useState, useEffect, useRef } from 'react';
import { TranslationProject, TranslationBlock, DisplayMode, SUPPORTED_LANGUAGES, AVAILABLE_MODELS, FicMetadata, DEFAULT_PROMPT, DEFAULT_REFINE_PROMPT } from './types';
import { identifyFandom, translateBatch } from './services/geminiService';
import { splitTextIntoBlocks, generateId, exportTranslation, parseUploadedFile, sanitizeProjectData } from './services/utils';
import { Download, Play, Pause, Loader2, Settings as SettingsIcon, Sliders, ChevronDown } from 'lucide-react';
import TranslationReader from './components/TranslationReader';
import HistorySidebar from './components/HistorySidebar';
import FavoritesPage from './components/FavoritesPage';
import Navbar from './components/Navbar';
import TranslationInput from './components/TranslationInput';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import { ThemeProvider } from './components/ThemeContext';
import { UI_STRINGS, LanguageCode } from './services/i18n';

const Main: React.FC = () => {
  const [uiLang, setUiLang] = useState<LanguageCode>('zh'); 
  const t = UI_STRINGS[uiLang];

  const [inputUrl, setInputUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'url' | 'text' | 'file'>('file');
  
  const [detectedMeta, setDetectedMeta] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [history, setHistory] = useState<TranslationProject[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.TRANSLATED_ONLY);
  const [targetLang, setTargetLang] = useState('zh-CN');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false);
  
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

  // History Persistence
  useEffect(() => {
    const saved = localStorage.getItem('ao3_translator_history');
    if (saved) {
      try {
        const cleanedHistory = (JSON.parse(saved) as TranslationProject[]).map(sanitizeProjectData);
        setHistory(cleanedHistory);
      } catch (e) { console.error("History load error"); }
    }
  }, []);

  useEffect(() => { localStorage.setItem('ao3_translator_history', JSON.stringify(history)); }, [history]);

  // Sync Project to Settings
  useEffect(() => {
    if (currentProject) {
      const total = currentProject.blocks.length;
      const current = currentProject.blocks.filter(b => b.translated).length;
      setProgress({ current, total });
      if (currentProject.metadata.model) setSelectedModel(currentProject.metadata.model);
      if (currentProject.metadata.customPrompt) setCustomPrompt(currentProject.metadata.customPrompt);
      if (currentProject.metadata.refinePromptTemplate) setRefinePromptTemplate(currentProject.metadata.refinePromptTemplate);
      if (currentProject.metadata.batchSize !== undefined) setBatchSize(currentProject.metadata.batchSize);
      if (currentProject.metadata.contextWindow !== undefined) setContextWindow(currentProject.metadata.contextWindow);
      if (currentProject.metadata.glossary) setGlossary(currentProject.metadata.glossary);
      if (currentProject.metadata.includeTags !== undefined) setIncludeTags(currentProject.metadata.includeTags);
      if (currentProject.metadata.tagInstruction) setTagInstruction(currentProject.metadata.tagInstruction);
      if (currentProject.metadata.targetLanguage) setTargetLang(currentProject.metadata.targetLanguage);
    }
  }, [currentProject]);

  const generateSmartPrompt = (meta: any) => {
    return `You are a professional literary translator specializing in Fanfiction.\n\nMetadata Context:\n- Title: ${meta.title}\n- Author: ${meta.author}\n- Fandom: ${meta.fandom}${meta.tags.length > 0 ? `\n- Tags: ${meta.tags.slice(0, 20).join(', ')}` : ''}\n\nDirectives:\n1. Maintain character voices and the ${meta.fandom} tone.\n2. Prioritize literary flow and emotional resonance.\n3. Correct terminology usage.\n4. Optimized typography.`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setInputFile(file);
      try {
        const parsed = await parseUploadedFile(file);
        setDetectedMeta(parsed);
        setCustomPrompt(generateSmartPrompt(parsed));
        if (parsed.tags.length > 0) setShowSettings(true);
      } catch (error) { console.error("File parse error", error); }
    }
  };

  const handleStop = () => { stopProcessingRef.current = true; setIsProcessing(false); };

  const handleSaveProjectSettings = () => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      metadata: { 
          ...currentProject.metadata, 
          model: selectedModel, 
          customPrompt, 
          refinePromptTemplate,
          contextWindow, 
          batchSize, 
          glossary, 
          includeTags, 
          tagInstruction, 
          targetLanguage: targetLang 
      },
      lastModified: Date.now()
    };
    setCurrentProject(updated);
    setHistory(prev => prev.map(p => p.id === updated.id ? updated : p));
    setShowProjectSettingsModal(false);
  };

  const handleStart = async () => {
    stopProcessingRef.current = false;
    let projectToUse: TranslationProject;

    try {
      if (currentProject && currentProject.blocks.length > 0) {
        // Resuming: update metadata with current UI settings
        projectToUse = { 
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
            } 
        };
      } else {
        // New Project
        setIsProcessing(true);
        let blocks, title, author, fandom, tags;
        if (inputType === 'file' && inputFile) {
          const parsed = detectedMeta || await parseUploadedFile(inputFile);
          ({ blocks, title, author, fandom, tags } = parsed);
        } else if (inputType === 'text' && inputText) {
          title = inputText.split('\n')[0].slice(0, 50) || "Pasted Fanfic";
          author = "Unknown"; tags = []; fandom = "Unknown";
          blocks = splitTextIntoBlocks(inputText);
        } else { setIsProcessing(false); return; }

        if (fandom === "Unknown") fandom = await identifyFandom(blocks.slice(0, 3).map((b: any) => b.original).join('\n'), selectedModel);

        projectToUse = {
          id: generateId(),
          metadata: { 
              title, author, fandom, tags, 
              originalLanguage: 'auto', 
              targetLanguage: targetLang, 
              model: selectedModel, 
              customPrompt, 
              refinePromptTemplate, 
              contextWindow, 
              batchSize, 
              includeTags, 
              tagInstruction, 
              glossary, 
              date: new Date().toISOString() 
          },
          blocks, lastModified: Date.now(),
        };
        setCurrentProject(projectToUse);
      }

      setIsProcessing(true);
      const BATCH_SIZE = Math.max(1, batchSize);
      const translatedBlocks = [...projectToUse.blocks];
      const contextBuffer: string[] = [];

      // Initialize context buffer with already translated blocks if any
      let translatedCount = 0;
      translatedBlocks.forEach(b => {
          if (b.translated) {
             translatedCount++;
             contextBuffer.push(b.original);
             if (contextBuffer.length > contextWindow) contextBuffer.shift();
          }
      });
      setProgress({ current: translatedCount, total: translatedBlocks.length });

      for (let i = 0; i < translatedBlocks.length; i += BATCH_SIZE) {
        if (stopProcessingRef.current) break;
        
        const batch = translatedBlocks.slice(i, i + BATCH_SIZE);
        const indices = batch.map((b, idx) => !b.translated ? i + idx : -1).filter(idx => idx !== -1);
        
        // Skip if all in batch are already translated
        if (indices.length === 0) {
           batch.forEach(b => { 
               if(b.translated) { 
                 // Doing nothing here as buffer is pre-filled or maintained
               }
           });
           continue; 
        }

        indices.forEach(idx => translatedBlocks[idx].isLoading = true);
        setCurrentProject({ ...projectToUse, blocks: [...translatedBlocks] });

        try {
          const results = await translateBatch(
              indices.map(idx => translatedBlocks[idx].original), 
              targetLang, 
              projectToUse.metadata.fandom, 
              { 
                  model: selectedModel, 
                  customPrompt, 
                  previousContext: contextBuffer.join('\n'), 
                  tags: includeTags ? projectToUse.metadata.tags : [], 
                  tagInstruction, 
                  glossary 
              }
          );
          indices.forEach((realIdx, mapIdx) => { 
              translatedBlocks[realIdx].translated = results[mapIdx]; 
              translatedBlocks[realIdx].isLoading = false; 
          });
        } catch (err) { 
            indices.forEach(idx => translatedBlocks[idx].isLoading = false); 
        }

        // Update context buffer with the newly translated block originals
        batch.forEach(b => { contextBuffer.push(b.original); if (contextBuffer.length > contextWindow) contextBuffer.shift(); });
        
        const updated = { ...projectToUse, blocks: [...translatedBlocks], lastModified: Date.now() };
        setCurrentProject(updated);
        setHistory(prev => [updated, ...prev.filter(p => p.id !== updated.id)]);
        setProgress({ current: translatedBlocks.filter(b => b.translated).length, total: translatedBlocks.length });
      }
    } catch (e) { alert(t.errorGeneric); } finally { setIsProcessing(false); stopProcessingRef.current = false; }
  };

  const handleUpdateBlock = (blockId: string, newText: string) => {
    setCurrentProject((prev) => {
        if (!prev) return null;
        const updatedBlocks = prev.blocks.map(b => b.id === blockId ? { ...b, translated: newText, isEdited: true, isLoading: false } : b);
        const updated = { ...prev, blocks: updatedBlocks, lastModified: Date.now() };
        setHistory(h => h.map(p => p.id === updated.id ? updated : p));
        return updated;
    });
  };

  const handleBlockLoading = (blockId: string, loading: boolean) => {
    setCurrentProject((prev) => {
        if (!prev) return null;
        return { ...prev, blocks: prev.blocks.map(b => b.id === blockId ? { ...b, isLoading: loading } : b) };
    });
  };

  const handleToggleFavorite = (projectId: string, blockId: string) => {
      const updateList = (list: TranslationProject[]) => list.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, isFavorite: !b.isFavorite } : b), lastModified: Date.now() };
      });
      setHistory(prev => {
          const next = updateList(prev);
          setCurrentProject(curr => curr && curr.id === projectId ? next.find(p => p.id === projectId)! : curr);
          return next;
      });
  };

  const handleUpdateNote = (projectId: string, blockId: string, note: string) => {
      const updateList = (list: TranslationProject[]) => list.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, note } : b), lastModified: Date.now() };
      });
      setHistory(prev => {
          const next = updateList(prev);
          setCurrentProject(curr => curr && curr.id === projectId ? next.find(p => p.id === projectId)! : curr);
          return next;
      });
  };

  const handleSetBookmark = (blockId: string) => {
      setCurrentProject(prev => {
          if (!prev) return null;
          const updated = { ...prev, bookmarkBlockId: blockId, lastModified: Date.now() };
          setHistory(h => h.map(p => p.id === updated.id ? updated : p));
          return updated;
      });
  };

  const deleteHistoryItem = (id: string) => { setHistory(prev => prev.filter(p => p.id !== id)); if (currentProject?.id === id) setCurrentProject(null); };
  
  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if(e.target.files && e.target.files[0]) {
          fileReader.readAsText(e.target.files[0], "UTF-8");
          fileReader.onload = (event) => {
              try {
                  const imported = JSON.parse(event.target?.result as string);
                  if(Array.isArray(imported)) {
                      setHistory(prev => {
                          const existingIds = new Set(prev.map(p => p.id));
                          const newItems = (imported as TranslationProject[]).filter(p => !existingIds.has(p.id)).map(sanitizeProjectData);
                          return [...newItems, ...prev];
                      });
                  } else { alert(t.errorImport); }
              } catch (err) { alert(t.errorImport); }
          };
      }
  };

  const handleExportHistory = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ao3_translator_data_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-[#121212] text-gray-800 dark:text-gray-200 font-sans selection:bg-red-100 dark:selection:bg-red-900/30 selection:text-red-900 transition-colors">
      <Navbar 
        uiLang={uiLang} setUiLang={setUiLang} 
        showFavorites={showFavorites} setShowFavorites={setShowFavorites}
        setHistoryOpen={setHistoryOpen} hasHistory={history.length > 0}
        currentProject={currentProject} displayMode={displayMode} setDisplayMode={setDisplayMode}
        onHome={() => { setCurrentProject(null); setShowFavorites(false); }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showFavorites ? (
          <FavoritesPage 
            history={history} 
            lang={uiLang} 
            onNavigateToProject={(pid, bid) => { setCurrentProject(history.find(p => p.id === pid)!); setShowFavorites(false); }} 
            onUpdateNote={handleUpdateNote} 
            onRemoveFavorite={handleToggleFavorite} 
            onExportBackup={handleExportHistory} 
            onClose={() => setShowFavorites(false)} 
          />
        ) : currentProject ? (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors">
              <div className="text-center md:text-left">
                <h1 className="font-serif font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{currentProject.metadata.title}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-black">{currentProject.metadata.fandom}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <button 
                    onClick={() => setShowProjectSettingsModal(true)} 
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors"
                >
                    <SettingsIcon className="w-4 h-4"/> {t.settings}
                </button>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>
                {!isProcessing && progress.current < progress.total && <button onClick={handleStart} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 hover:bg-green-700 transition-colors"><Play className="w-4 h-4"/> {t.resume}</button>}
                {isProcessing && <button onClick={handleStop} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 hover:bg-amber-600 transition-colors"><Pause className="w-4 h-4"/> {t.pause}</button>}
                <button onClick={() => exportTranslation(currentProject, 'markdown')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t.exportMD}</button>
              </div>
            </div>
            <TranslationReader 
              blocks={currentProject.blocks} 
              displayMode={displayMode} 
              fandom={currentProject.metadata.fandom} 
              targetLang={targetLang} 
              model={selectedModel} 
              refinePromptTemplate={refinePromptTemplate}
              bookmarkBlockId={currentProject.bookmarkBlockId}
              onUpdateBlock={handleUpdateBlock} 
              onLoadingStateChange={handleBlockLoading} 
              onToggleFavorite={(bid) => handleToggleFavorite(currentProject.id, bid)} 
              onSetBookmark={handleSetBookmark} 
              onUpdateNote={(bid, note) => handleUpdateNote(currentProject.id, bid, note)} 
              onOpenSettings={() => setShowProjectSettingsModal(true)}
              lang={uiLang}
            />
          </div>
        ) : (
          <TranslationInput 
            uiLang={uiLang} inputType={inputType} setInputType={setInputType} detectedMeta={detectedMeta} inputFile={inputFile} 
            handleFileChange={handleFileChange} inputText={inputText} setInputText={setInputText} inputUrl={inputUrl} setInputUrl={setInputUrl}
            targetLang={targetLang} setTargetLang={setTargetLang} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            showSettings={showSettings} setShowSettings={setShowSettings} batchSize={batchSize} setBatchSize={setBatchSize} 
            contextWindow={contextWindow} setContextWindow={setContextWindow} includeTags={includeTags} setIncludeTags={setIncludeTags}
            customPrompt={customPrompt} setCustomPrompt={setCustomPrompt} tagInstruction={tagInstruction} setTagInstruction={setTagInstruction}
            glossary={glossary} setGlossary={setGlossary} onRestorePrompt={() => setCustomPrompt(DEFAULT_PROMPT)} 
            onRemoveTag={(tag) => setDetectedMeta((prev: any) => ({...prev, tags: prev.tags.filter((t:string) => t !== tag)}))}
            isProcessing={isProcessing} onStart={handleStart}
          />
        )}
      </main>

      <ProjectSettingsModal 
        uiLang={uiLang} isOpen={showProjectSettingsModal} onClose={() => setShowProjectSettingsModal(false)} onSave={handleSaveProjectSettings}
        settings={{ selectedModel, setSelectedModel, targetLang, setTargetLang, batchSize, setBatchSize, contextWindow, setContextWindow, customPrompt, setCustomPrompt, refinePromptTemplate, setRefinePromptTemplate, glossary, setGlossary, includeTags, setIncludeTags, tagInstruction, setTagInstruction }}
        onRestorePrompt={() => setCustomPrompt(DEFAULT_PROMPT)}
      />

      <HistorySidebar history={history} onSelect={(p) => setCurrentProject(p)} onDelete={deleteHistoryItem} onClear={() => setHistory([])} onImport={handleImportHistory} onExport={handleExportHistory} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} lang={uiLang} />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <Main />
  </ThemeProvider>
);

export default App;
