
import React, { useState, useEffect, useRef } from 'react';
import { TranslationProject, TranslationBlock, DisplayMode, SUPPORTED_LANGUAGES, AVAILABLE_MODELS, FicMetadata, DEFAULT_PROMPT, DEFAULT_REFINE_PROMPT, ReadingSettings, BackupSettings } from './types';
import { identifyFandom, translateBatch } from './services/geminiService';
import { splitTextIntoBlocks, generateId, exportTranslation, parseUploadedFile, sanitizeProjectData, mergeProjectBlocks, calculateSimilarity, recalculateChapterIndices, fetchAO3FromProxy } from './services/utils';
import { Download, Play, Pause, Loader2, Settings as SettingsIcon, Sliders, ChevronDown } from 'lucide-react';
import TranslationReader from './components/TranslationReader';
import HistoryPage from './components/HistoryPage';
import FavoritesPage from './components/FavoritesPage';
import Navbar from './components/Navbar';
import TranslationInput from './components/TranslationInput';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { UI_STRINGS, LanguageCode } from './services/i18n';
import Tooltip from './components/Tooltip';

// Wrapper component to use the hook
const AppContent: React.FC = () => {
  const [uiLang, setUiLang] = useState<LanguageCode>('zh'); 
  const t = UI_STRINGS[uiLang];
  const { showToast } = useToast();

  const [inputUrl, setInputUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'url' | 'text' | 'file'>('file');
  
  const [detectedMeta, setDetectedMeta] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [history, setHistory] = useState<TranslationProject[]>([]);
  
  // New: Reading & Backup Settings
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(() => {
     const defaults: ReadingSettings = { 
         fontSize: 18, 
         lineHeight: 1.8, 
         blockSpacing: 24, 
         fontFamily: 'serif', 
         maxWidth: 70, 
         paperTheme: 'default',
         overlayOpacity: 0.9, 
         overlayBlur: 0       
     };
     const saved = localStorage.getItem('ao3_reading_settings');
     // Merge saved with defaults to ensure new keys exist
     return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => {
      const saved = localStorage.getItem('ao3_backup_settings');
      return saved ? JSON.parse(saved) : { autoBackupEnabled: false, backupIntervalMinutes: 30 };
  });

  // Navigation State - Mutually Exclusive
  // Changed default from 'none' to 'history'
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'history' | 'favorites'>('history');
  
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

  // Update File Input State
  const updateInputRef = useRef<HTMLInputElement>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);

  // Persistence Effects
  useEffect(() => {
    const saved = localStorage.getItem('ao3_translator_history');
    if (saved) {
      try {
        const cleanedHistory = (JSON.parse(saved) as TranslationProject[]).map(sanitizeProjectData);
        setHistory(cleanedHistory);
      } catch (e) { console.error("History load error"); }
    }
  }, []);

  useEffect(() => { 
      try {
        localStorage.setItem('ao3_translator_history', JSON.stringify(history));
      } catch (e) { console.error("Failed to save history:", e); }
  }, [history]);

  useEffect(() => { 
      try {
        localStorage.setItem('ao3_reading_settings', JSON.stringify(readingSettings));
      } catch (e) { 
          console.error("Failed to save reading settings (likely image too big):", e);
          showToast("Settings too large to save (Background Image).", "error");
      }
  }, [readingSettings]);

  useEffect(() => { 
      try {
        localStorage.setItem('ao3_backup_settings', JSON.stringify(backupSettings)); 
      } catch (e) { console.error("Failed to save backup settings:", e); }
  }, [backupSettings]);

  // Auto Backup Interval
  useEffect(() => {
      if (!backupSettings.autoBackupEnabled) return;

      const intervalId = setInterval(() => {
          const now = Date.now();
          const lastBackup = backupSettings.lastBackupTime || 0;
          const intervalMs = backupSettings.backupIntervalMinutes * 60 * 1000;

          if (now - lastBackup > intervalMs && history.length > 0) {
              const dataStr = JSON.stringify(history);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", url);
              downloadAnchorNode.setAttribute("download", `ao3_auto_backup_${new Date().toISOString().slice(0,10)}.json`);
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
              URL.revokeObjectURL(url);
              
              setBackupSettings(prev => ({ ...prev, lastBackupTime: now }));
              showToast(t.toastAutoBackup, "info");
          }
      }, 60000); 

      return () => clearInterval(intervalId);
  }, [backupSettings, history]);

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

  const toggleHistory = () => setActiveOverlay(prev => prev === 'history' ? 'none' : 'history');
  const toggleFavorites = () => setActiveOverlay(prev => prev === 'favorites' ? 'none' : 'favorites');
  const closeOverlays = () => setActiveOverlay('none');

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
        showToast(t.toastFileParsed, "success");
      } catch (error) { 
          console.error("File parse error", error); 
          showToast(t.toastFileError, "error");
      }
    }
  };

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
    showToast(t.toastSettingsSaved, "success");
  };
  
  const handleToggleBlockType = (blockId: string) => {
      if (!currentProject) return;
      const newBlocks = currentProject.blocks.map(b => 
          b.id === blockId ? { ...b, type: b.type === 'header' ? 'text' : 'header' } : b
      );
      const reindexedBlocks = recalculateChapterIndices(newBlocks as TranslationBlock[]);
      const updatedProject = {
          ...currentProject,
          blocks: reindexedBlocks,
          lastModified: Date.now()
      };
      setCurrentProject(updatedProject);
      setHistory(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleCreateNew = () => {
      setCurrentProject(null);
      closeOverlays();
      setInputFile(null);
      setInputText('');
      setDetectedMeta(null);
  };

  const handleStart = async () => {
    stopProcessingRef.current = false;
    let projectToUse: TranslationProject;

    try {
      if (currentProject && currentProject.blocks.length > 0) {
        // Resuming
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
        let blocks, title, author, fandom, tags, url;
        if (inputType === 'file' && inputFile) {
          const parsed = detectedMeta || await parseUploadedFile(inputFile);
          ({ blocks, title, author, fandom, tags, url } = parsed);
        } else if (inputType === 'text' && inputText) {
          title = inputText.split('\n')[0].slice(0, 50) || t.defaultTitle;
          author = t.unknown; tags = []; fandom = t.unknownFandom;
          blocks = splitTextIntoBlocks(inputText);
        } else if (inputType === 'url' && inputUrl) {
           try {
               const parsed = await fetchAO3FromProxy(inputUrl);
               ({ blocks, title, author, fandom, tags, url } = parsed);
           } catch(e: any) {
               console.error("Fetch failed", e);
               // IMPORTANT: Use specific translated toast message for fetch failure
               showToast(t.toastFetchError, "error");
               setIsProcessing(false);
               return;
           }
        } else { setIsProcessing(false); return; }

        if (fandom === "Unknown" && targetLang !== 'original') fandom = await identifyFandom(blocks.slice(0, 3).map((b: any) => b.original).join('\n'), selectedModel);

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
              url: url || inputUrl,
              date: new Date().toISOString() 
          },
          blocks, lastModified: Date.now(),
        };
        projectToUse = sanitizeProjectData(projectToUse);
        setCurrentProject(projectToUse);
      }

      if (targetLang === 'original') {
         const autoFilledBlocks = projectToUse.blocks.map(b => ({
             ...b,
             translated: b.original,
             isLoading: false
         }));
         const completedProject = {
             ...projectToUse,
             blocks: autoFilledBlocks,
             lastModified: Date.now()
         };
         setCurrentProject(completedProject);
         setHistory(prev => [completedProject, ...prev.filter(p => p.id !== completedProject.id)]);
         setProgress({ current: autoFilledBlocks.length, total: autoFilledBlocks.length });
         setIsProcessing(false);
         return;
      }

      setIsProcessing(true);
      const BATCH_SIZE = Math.max(1, batchSize);
      const translatedBlocks = [...projectToUse.blocks];
      const contextBuffer: string[] = [];

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
        
        if (indices.length === 0) {
           batch.forEach(b => { 
               if(b.translated) { 
                 contextBuffer.push(b.original); 
                 if (contextBuffer.length > contextWindow) contextBuffer.shift();
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
          
          batch.forEach(b => { contextBuffer.push(b.original); if (contextBuffer.length > contextWindow) contextBuffer.shift(); });
          
        } catch (err: any) { 
            console.error("Batch failed, stopping processing:", err);
            indices.forEach(idx => translatedBlocks[idx].isLoading = false);
            setCurrentProject({ ...projectToUse, blocks: [...translatedBlocks] });
            stopProcessingRef.current = true;
            setIsProcessing(false);
            showToast(`${t.errorGeneric}: ${err.message}`, "error");
            break; 
        }

        const updated = { ...projectToUse, blocks: [...translatedBlocks], lastModified: Date.now() };
        setCurrentProject(updated);
        setHistory(prev => [updated, ...prev.filter(p => p.id !== updated.id)]);
        setProgress({ current: translatedBlocks.filter(b => b.translated).length, total: translatedBlocks.length });
      }
    } catch (e) { 
        console.error("Critical App Error", e);
        showToast(t.errorGeneric, "error"); 
    } finally { 
        setIsProcessing(false); 
        stopProcessingRef.current = false; 
    }
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
                  let importedProjects: TranslationProject[] = [];
                  
                  // Handle legacy format (Array) vs New format (Object with settings)
                  if (Array.isArray(imported)) {
                      importedProjects = imported;
                  } else if (imported.history && Array.isArray(imported.history)) {
                      importedProjects = imported.history;
                      // Restore Settings if present
                      if (imported.settings) {
                          if(imported.settings.reading) setReadingSettings(imported.settings.reading);
                          if(imported.settings.backup) setBackupSettings(imported.settings.backup);
                          if(imported.settings.translation) {
                              const ts = imported.settings.translation;
                              if(ts.targetLang) setTargetLang(ts.targetLang);
                              if(ts.selectedModel) setSelectedModel(ts.selectedModel);
                              if(ts.batchSize) setBatchSize(ts.batchSize);
                              if(ts.customPrompt) setCustomPrompt(ts.customPrompt);
                              if(ts.glossary) setGlossary(ts.glossary);
                          }
                      }
                  }

                  if(importedProjects.length > 0) {
                      setHistory(prev => {
                          const existingIds = new Set(prev.map(p => p.id));
                          const newItems = importedProjects.filter(p => !existingIds.has(p.id)).map(sanitizeProjectData);
                          return [...newItems, ...prev];
                      });
                      showToast(t.toastImportSuccess, "success");
                  } else { showToast(t.errorImport, "error"); }
              } catch (err) { showToast(t.errorImport, "error"); }
          };
      }
  };

  const handleExportHistory = async () => {
      // Extended export with settings
      const exportData = {
          type: 'ao3-translator-backup',
          version: 1,
          date: new Date().toISOString(),
          history,
          settings: {
              reading: readingSettings,
              backup: backupSettings,
              translation: {
                  targetLang,
                  selectedModel,
                  batchSize,
                  contextWindow,
                  customPrompt,
                  refinePromptTemplate,
                  glossary,
                  includeTags,
                  tagInstruction
              }
          }
      };

      const dataStr = JSON.stringify(exportData);
      const fileName = `ao3_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      try {
          const isIframe = window.self !== window.top;
          if ('showSaveFilePicker' in window && !isIframe) {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: fileName,
                  types: [{
                      description: 'JSON Backup File',
                      accept: { 'application/json': ['.json'] },
                  }],
              });
              const writable = await handle.createWritable();
              await writable.write(dataStr);
              await writable.close();
              showToast(t.toastBackupSaved, "success");
              return; 
          }
      } catch (err: any) {
          if (err.name === 'AbortError') return;
      }

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
      showToast(t.toastBackupSaved, "success");
  };

  const handleExportCurrent = (format: 'markdown' | 'html') => {
    if (currentProject) exportTranslation(currentProject, format);
  };

  const triggerUpdateProject = (projectId: string) => {
      setUpdatingProjectId(projectId);
      setTimeout(() => updateInputRef.current?.click(), 100);
  };

  const handleUpdateFromUrl = async (projectId: string, url: string) => {
      setIsUpdatingFromUrl(true);
      try {
          const newParsed = await fetchAO3FromProxy(url);
          const oldProject = history.find(p => p.id === projectId);
          
          if (!oldProject) { setIsUpdatingFromUrl(false); return; }

          const similarity = calculateSimilarity(oldProject.blocks, newParsed.blocks);
          
          let proceed = true;
          if (similarity < 20) {
             proceed = true; // Bypassing confirm for now, relying on Toast info
             showToast(t.updateWarningMsg.replace('{{percent}}', similarity.toString()), "info");
          }

          if (proceed) {
             const mergedBlocks = mergeProjectBlocks(oldProject.blocks, newParsed.blocks);
             const updatedProject: TranslationProject = {
                  ...oldProject,
                  blocks: mergedBlocks,
                  metadata: {
                      ...oldProject.metadata,
                      title: newParsed.title || oldProject.metadata.title,
                      tags: (newParsed.tags && newParsed.tags.length > 0) ? newParsed.tags : oldProject.metadata.tags,
                      url: newParsed.url || url || oldProject.metadata.url
                  },
                  lastModified: Date.now()
             };

             setHistory(prev => prev.map(p => p.id === projectId ? updatedProject : p));
             if (currentProject && currentProject.id === projectId) {
                 setCurrentProject(updatedProject);
             }
             showToast(t.updateSuccess, "success");
          }
      } catch (err: any) {
          console.error(err);
          // Show specific robust error message
          showToast(t.toastFetchError, "error");
      } finally {
          setIsUpdatingFromUrl(false);
      }
  };

  const handleUpdateFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !updatingProjectId) return;
      
      try {
          const newParsed = await parseUploadedFile(file);
          const oldProject = history.find(p => p.id === updatingProjectId);
          if (!oldProject) return;

          const similarity = calculateSimilarity(oldProject.blocks, newParsed.blocks);
          
          let proceed = true;
          if (similarity < 20) {
              const msg = t.updateWarningMsg.replace('{{percent}}', similarity.toString());
              proceed = window.confirm(`${t.updateWarningTitle}\n\n${msg}`);
          }

          if (proceed) {
             const mergedBlocks = mergeProjectBlocks(oldProject.blocks, newParsed.blocks);
             const updatedProject: TranslationProject = {
                  ...oldProject,
                  blocks: mergedBlocks,
                  metadata: {
                      ...oldProject.metadata,
                      title: newParsed.title || oldProject.metadata.title,
                      tags: (newParsed.tags && newParsed.tags.length > 0) ? newParsed.tags : oldProject.metadata.tags
                  },
                  lastModified: Date.now()
             };

             setHistory(prev => prev.map(p => p.id === updatingProjectId ? updatedProject : p));
             if (currentProject && currentProject.id === updatingProjectId) {
                 setCurrentProject(updatedProject);
             }
             showToast(t.updateSuccess, "success");
          }
      } catch (err) {
          console.error(err);
          showToast(t.errorGeneric, "error");
      } finally {
          setUpdatingProjectId(null);
          if (updateInputRef.current) updateInputRef.current.value = '';
      }
  };

  const renderMainContent = () => {
    if (!currentProject) {
      return (
        <TranslationInput 
            uiLang={uiLang} inputType={inputType} setInputType={setInputType} 
            detectedMeta={detectedMeta} inputFile={inputFile} handleFileChange={handleFileChange}
            inputText={inputText} setInputText={setInputText} inputUrl={inputUrl} setInputUrl={setInputUrl}
            targetLang={targetLang} setTargetLang={setTargetLang} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            showSettings={showSettings} setShowSettings={setShowSettings} batchSize={batchSize} setBatchSize={setBatchSize}
            contextWindow={contextWindow} setContextWindow={setContextWindow} includeTags={includeTags} setIncludeTags={setIncludeTags}
            customPrompt={customPrompt} setCustomPrompt={setCustomPrompt} tagInstruction={tagInstruction} setTagInstruction={setTagInstruction}
            glossary={glossary} setGlossary={setGlossary} onRestorePrompt={() => { setCustomPrompt(DEFAULT_PROMPT); setRefinePromptTemplate(DEFAULT_REFINE_PROMPT); }}
            onRemoveTag={(t) => setDetectedMeta((prev: any) => ({ ...prev, tags: prev.tags.filter((x: string) => x !== t) }))}
            isProcessing={isProcessing} onStart={handleStart}
        />
      );
    } else {
      return (
        <TranslationReader 
             key={currentProject.id}
             blocks={currentProject.blocks} 
             displayMode={displayMode} 
             fandom={currentProject.metadata.fandom} 
             targetLang={currentProject.metadata.targetLanguage} 
             model={selectedModel} 
             refinePromptTemplate={refinePromptTemplate}
             bookmarkBlockId={currentProject.bookmarkBlockId}
             title={currentProject.metadata.title}
             author={currentProject.metadata.author}
             url={currentProject.metadata.url} 
             percentComplete={progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}
             isProcessing={isProcessing}
             onUpdateBlock={handleUpdateBlock} onLoadingStateChange={handleBlockLoading} 
             onToggleFavorite={(blockId) => handleToggleFavorite(currentProject.id, blockId)}
             onSetBookmark={handleSetBookmark}
             onUpdateNote={(blockId, note) => handleUpdateNote(currentProject.id, blockId, note)}
             onToggleBlockType={handleToggleBlockType}
             onOpenSettings={() => setShowProjectSettingsModal(true)}
             onUpdateSource={() => triggerUpdateProject(currentProject.id)}
             onUpdateFromUrl={(url) => handleUpdateFromUrl(currentProject.id, url)}
             isUpdatingFromUrl={isUpdatingFromUrl}
             onExport={handleExportCurrent}
             onContinue={handleStart}
             lang={uiLang}
             readingSettings={readingSettings} 
        />
      );
    }
  };

  return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-[#121212] text-gray-800 dark:text-gray-200 font-sans selection:bg-red-100 dark:selection:bg-red-900/30 selection:text-red-900 transition-colors">
        <input type="file" ref={updateInputRef} onChange={handleUpdateFileSelect} accept=".html,.htm,.txt" className="hidden" />
        
        <Navbar 
          uiLang={uiLang} setUiLang={setUiLang} 
          showFavorites={activeOverlay === 'favorites'} setShowFavorites={toggleFavorites} 
          showHistory={activeOverlay === 'history'} toggleHistory={toggleHistory}
          hasHistory={history.length > 0} 
          currentProject={currentProject} displayMode={displayMode} setDisplayMode={setDisplayMode} 
          onHome={handleCreateNew}
          onOpenSettings={() => setShowProjectSettingsModal(true)}
          onSaveData={handleExportHistory}
        />
        
        <div className={`transition-all duration-300 ${activeOverlay !== 'none' ? 'scale-[0.98] opacity-50 overflow-hidden h-[calc(100vh-64px)]' : ''}`}>
           <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             {renderMainContent()}
           </main>
        </div>

        {activeOverlay === 'history' && (
           <HistoryPage 
              history={history} lang={uiLang} 
              onNavigateToProject={(p) => { setCurrentProject(p); closeOverlays(); }}
              onCreateNew={handleCreateNew}
              onTriggerUpdate={triggerUpdateProject}
              onUpdateFromUrl={handleUpdateFromUrl}
              onDelete={deleteHistoryItem} 
              onClear={() => { 
                  if(confirm(t.confirmClear)) { setHistory([]); setCurrentProject(null); }
              }}
              onImport={handleImportHistory} onExport={handleExportHistory} onClose={closeOverlays}
           />
        )}

        {activeOverlay === 'favorites' && (
            <FavoritesPage 
               history={history} lang={uiLang} 
               onNavigateToProject={(pid, bid) => { 
                   const p = history.find(x => x.id === pid); 
                   if(p) { setCurrentProject(p); handleSetBookmark(bid); closeOverlays(); }
               }}
               onUpdateNote={(pid, bid, n) => handleUpdateNote(pid, bid, n)}
               onRemoveFavorite={(pid, bid) => handleToggleFavorite(pid, bid)}
               onExportBackup={handleExportHistory}
               onClose={closeOverlays}
            />
        )}

        <ProjectSettingsModal 
           uiLang={uiLang} isOpen={showProjectSettingsModal} onClose={() => setShowProjectSettingsModal(false)} onSave={handleSaveProjectSettings}
           fandom={currentProject?.metadata.fandom || detectedMeta?.fandom}
           settings={{ 
               selectedModel, setSelectedModel, targetLang, setTargetLang, batchSize, setBatchSize, contextWindow, setContextWindow, 
               customPrompt, setCustomPrompt, refinePromptTemplate, setRefinePromptTemplate, glossary, setGlossary, includeTags, setIncludeTags, tagInstruction, setTagInstruction 
           }}
           readingSettings={readingSettings} setReadingSettings={setReadingSettings}
           backupSettings={backupSettings} setBackupSettings={setBackupSettings} onBackupNow={handleExportHistory}
           onRestorePrompt={() => { setCustomPrompt(DEFAULT_PROMPT); setRefinePromptTemplate(DEFAULT_REFINE_PROMPT); }}
        />
      </div>
  );
};

const Main: React.FC = () => {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </ThemeProvider>
    );
}

export default Main;
