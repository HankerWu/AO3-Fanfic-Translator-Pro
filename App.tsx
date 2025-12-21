
import React, { useState, useEffect, useRef } from 'react';
import { TranslationProject, TranslationBlock, DisplayMode, AVAILABLE_MODELS, FicMetadata, DEFAULT_PROMPT, DEFAULT_REFINE_PROMPT, ReadingSettings, BackupSettings } from './types';
import { identifyFandom, translateBatch } from './services/geminiService';
import { splitTextIntoBlocks, generateId, exportTranslation, parseUploadedFile, sanitizeProjectData, mergeProjectBlocks, calculateSimilarity, recalculateChapterIndices, fetchAO3FromProxy, saveToBackend, openBackendFolder } from './services/utils';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import TranslationReader from './components/TranslationReader';
import HistoryPage from './components/HistoryPage';
import FavoritesPage from './components/FavoritesPage';
import Navbar from './components/Navbar';
import TranslationInput from './components/TranslationInput';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { UI_STRINGS, LanguageCode } from './services/i18n';

// Wrapper component to use the hook
const AppContent: React.FC = () => {
  const [uiLang, setUiLang] = useState<LanguageCode>('zh'); 
  const t = UI_STRINGS[uiLang];
  const { showToast } = useToast();
  // Ensure we have access to the theme for dynamic styling
  const { theme } = useTheme();

  // ... [Keep existing state initialization] ...
  const [inputUrl, setInputUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'url' | 'text' | 'file'>('file');
  const [detectedMeta, setDetectedMeta] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [history, setHistory] = useState<TranslationProject[]>([]);
  
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(() => {
     const defaults: ReadingSettings = { fontSize: 18, lineHeight: 1.8, blockSpacing: 24, fontFamily: 'serif', maxWidth: 70, paperTheme: 'default', overlayOpacity: 0.9, overlayBlur: 0 };
     const saved = localStorage.getItem('ao3_reading_settings');
     return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => {
      const saved = localStorage.getItem('ao3_backup_settings');
      return saved ? JSON.parse(saved) : { autoBackupEnabled: false, backupIntervalMinutes: 30 };
  });

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
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('ao3_custom_api_key') || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const stopProcessingRef = useRef(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const updateInputRef = useRef<HTMLInputElement>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);

  // New State for Custom Update Warning Modal
  const [pendingUpdate, setPendingUpdate] = useState<{ parsed: any, similarity: number, projectId: string } | null>(null);

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
      try { localStorage.setItem('ao3_translator_history', JSON.stringify(history)); } catch (e) { console.error(e); }
  }, [history]);

  useEffect(() => { 
      try { localStorage.setItem('ao3_reading_settings', JSON.stringify(readingSettings)); } catch (e) { console.error(e); }
  }, [readingSettings]);

  useEffect(() => { 
      try { localStorage.setItem('ao3_backup_settings', JSON.stringify(backupSettings)); } catch (e) { console.error(e); }
  }, [backupSettings]);

  useEffect(() => {
      localStorage.setItem('ao3_custom_api_key', customApiKey);
  }, [customApiKey]);

  // --- UPDATED AUTO BACKUP LOGIC ---
  useEffect(() => {
      if (!backupSettings.autoBackupEnabled) return;

      const intervalId = setInterval(async () => {
          const now = Date.now();
          const lastBackup = backupSettings.lastBackupTime || 0;
          const intervalMs = backupSettings.backupIntervalMinutes * 60 * 1000;

          if (now - lastBackup > intervalMs && history.length > 0) {
              const fileName = `ao3_auto_backup_${new Date().toISOString().slice(0,10)}.json`;
              
              // Try local backend first
              const success = await saveToBackend(history, fileName);

              if (success) {
                  setBackupSettings(prev => ({ ...prev, lastBackupTime: now }));
                  showToast("Auto-backup saved to local folder.", "success");
              } else {
                  // Fallback to browser download if backend not running
                  const dataStr = JSON.stringify(history);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute("href", url);
                  downloadAnchorNode.setAttribute("download", fileName);
                  document.body.appendChild(downloadAnchorNode);
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                  URL.revokeObjectURL(url);
                  
                  setBackupSettings(prev => ({ ...prev, lastBackupTime: now }));
                  showToast(t.toastAutoBackup, "info");
              }
          }
      }, 60000); 

      return () => clearInterval(intervalId);
  }, [backupSettings, history, t.toastAutoBackup]);

  // ... [Keep Sync Project to Settings Effect] ...
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
  
  // ... [Keep other handlers: handleToggleBlockType, handleCreateNew, handleImportSettings] ...
  const handleToggleBlockType = (blockId: string) => {
      if (!currentProject) return;
      const newBlocks = currentProject.blocks.map(b => 
          b.id === blockId ? { ...b, type: b.type === 'header' ? 'text' : 'header' } : b
      );
      const reindexedBlocks = recalculateChapterIndices(newBlocks as TranslationBlock[]);
      const updatedProject = { ...currentProject, blocks: reindexedBlocks, lastModified: Date.now() };
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

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if(e.target.files && e.target.files[0]) {
          fileReader.readAsText(e.target.files[0], "UTF-8");
          fileReader.onload = (event) => {
              try {
                  const imported = JSON.parse(event.target?.result as string);
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
                          if(ts.refinePromptTemplate) setRefinePromptTemplate(ts.refinePromptTemplate);
                          if(ts.contextWindow !== undefined) setContextWindow(ts.contextWindow);
                          if(ts.includeTags !== undefined) setIncludeTags(ts.includeTags);
                          if(ts.tagInstruction) setTagInstruction(ts.tagInstruction);
                      }
                      showToast("Configuration restored.", "success");
                  }
              } catch (err) { showToast(t.errorImport, "error"); }
          };
      }
  };

  const handleStart = async () => {
    stopProcessingRef.current = false;
    let projectToUse: TranslationProject;

    try {
      if (currentProject && currentProject.blocks.length > 0) {
        projectToUse = { 
            ...currentProject, 
            metadata: { 
                ...currentProject.metadata, 
                model: selectedModel, customPrompt, refinePromptTemplate, contextWindow, batchSize, includeTags, tagInstruction, glossary, targetLanguage: targetLang 
            } 
        };
      } else {
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
               showToast(t.toastFetchError, "error");
               setIsProcessing(false);
               return;
           }
        } else { setIsProcessing(false); return; }

        if (fandom === "Unknown" && targetLang !== 'original') fandom = await identifyFandom(blocks.slice(0, 3).map((b: any) => b.original).join('\n'), selectedModel, customApiKey);

        projectToUse = {
          id: generateId(),
          metadata: { title, author, fandom, tags, originalLanguage: 'auto', targetLanguage: targetLang, model: selectedModel, customPrompt, refinePromptTemplate, contextWindow, batchSize, includeTags, tagInstruction, glossary, url: url || inputUrl, date: new Date().toISOString() },
          blocks, lastModified: Date.now(),
        };
        projectToUse = sanitizeProjectData(projectToUse);
        setCurrentProject(projectToUse);
      }

      if (targetLang === 'original') {
         // ... [Keep Original Mode Logic] ...
         const autoFilledBlocks = projectToUse.blocks.map(b => ({ ...b, translated: b.original, isLoading: false }));
         const completedProject = { ...projectToUse, blocks: autoFilledBlocks, lastModified: Date.now() };
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
      let translatedCount = translatedBlocks.filter(b => b.translated).length;
      // Pre-fill context buffer
      translatedBlocks.forEach(b => {
          if (b.translated) {
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
           batch.forEach(b => { if(b.translated) { contextBuffer.push(b.original); if (contextBuffer.length > contextWindow) contextBuffer.shift(); }});
           continue; 
        }

        indices.forEach(idx => translatedBlocks[idx].isLoading = true);
        setCurrentProject({ ...projectToUse, blocks: [...translatedBlocks] });

        try {
          const results = await translateBatch(
              indices.map(idx => translatedBlocks[idx].original), 
              targetLang, 
              projectToUse.metadata.fandom, 
              { model: selectedModel, customPrompt, previousContext: contextBuffer.join('\n'), tags: includeTags ? projectToUse.metadata.tags : [], tagInstruction, glossary, apiKey: customApiKey }
          );
          indices.forEach((realIdx, mapIdx) => { 
              translatedBlocks[realIdx].translated = results[mapIdx]; 
              translatedBlocks[realIdx].isLoading = false; 
          });
          batch.forEach(b => { contextBuffer.push(b.original); if (contextBuffer.length > contextWindow) contextBuffer.shift(); });
        } catch (err: any) { 
            indices.forEach(idx => translatedBlocks[idx].isLoading = false);
            setCurrentProject({ ...projectToUse, blocks: [...translatedBlocks] });
            stopProcessingRef.current = true;
            showToast(`${t.errorGeneric}: ${err.message}`, "error");
            break; 
        }

        const updated = { ...projectToUse, blocks: [...translatedBlocks], lastModified: Date.now() };
        setCurrentProject(updated);
        setHistory(prev => [updated, ...prev.filter(p => p.id !== updated.id)]);
        setProgress({ current: translatedBlocks.filter(b => b.translated).length, total: translatedBlocks.length });
      }
    } catch (e) { 
        showToast(t.errorGeneric, "error"); 
    } finally { 
        setIsProcessing(false); 
        stopProcessingRef.current = false; 
    }
  };

  // ... [Keep block update handlers] ...
  const handleUpdateBlock = (blockId: string, newText: string) => {
    setCurrentProject((prev) => {
        if (!prev) return null;
        const updated = { ...prev, blocks: prev.blocks.map(b => b.id === blockId ? { ...b, translated: newText, isEdited: true, isLoading: false } : b), lastModified: Date.now() };
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
      setHistory(prev => {
          const next = prev.map(p => p.id === projectId ? { ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, isFavorite: !b.isFavorite } : b), lastModified: Date.now() } : p);
          setCurrentProject(curr => curr && curr.id === projectId ? next.find(p => p.id === projectId)! : curr);
          return next;
      });
  };
  const handleUpdateNote = (projectId: string, blockId: string, note: string) => {
      setHistory(prev => {
          const next = prev.map(p => p.id === projectId ? { ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, note } : b), lastModified: Date.now() } : p);
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
                  if (Array.isArray(imported)) {
                      importedProjects = imported;
                  } else if (imported.history && Array.isArray(imported.history)) {
                      importedProjects = imported.history;
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

  // --- UPDATED MANUAL BACKUP HANDLER ---
  const handleExportHistory = async () => {
      const exportData = {
          type: 'ao3-translator-backup',
          version: 1,
          date: new Date().toISOString(),
          history,
          settings: {
              reading: readingSettings,
              backup: backupSettings,
              translation: { targetLang, selectedModel, batchSize, contextWindow, customPrompt, refinePromptTemplate, glossary, includeTags, tagInstruction }
          }
      };
      
      const fileName = `ao3_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      // Try backend first
      const success = await saveToBackend(exportData, fileName);
      if (success) {
          // If successful, show toast and maybe open folder
          showToast(`Backup saved to local folder: ${fileName}`, "success");
          // Optional: Prompt to open folder? Or just let user click a button elsewhere
          return;
      }

      // Fallback: Browser Save File Picker (Chrome only)
      try {
          const isIframe = window.self !== window.top;
          if ('showSaveFilePicker' in window && !isIframe) {
              const handle = await (window as any).showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }] });
              const writable = await handle.createWritable();
              await writable.write(JSON.stringify(exportData));
              await writable.close();
              showToast(t.toastBackupSaved, "success");
              return; 
          }
      } catch (err: any) { if (err.name === 'AbortError') return; }

      // Fallback: Download Blob
      const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(t.toastBackupSaved, "success");
  };

  const handleExportCurrent = (format: 'markdown' | 'html') => {
    if (currentProject) exportTranslation(currentProject, format);
  };
  
  const triggerUpdateProject = (projectId: string) => { setUpdatingProjectId(projectId); setTimeout(() => updateInputRef.current?.click(), 100); };
  
  const handleUpdateFromUrl = async (projectId: string, url: string) => {
      setIsUpdatingFromUrl(true);
      try {
          const newParsed = await fetchAO3FromProxy(url);
          // Auto-confirm logic for URL updates since we trust the proxy result usually, 
          // or we can add the check here too. For now keeping it simple as before but ensuring URL updates.
          processProjectUpdate(newParsed, projectId);
      } catch (err: any) { showToast(t.toastFetchError, "error"); } finally { setIsUpdatingFromUrl(false); }
  };

  const handleUpdateFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !updatingProjectId) return;
      try {
          const newParsed = await parseUploadedFile(file);
          const oldProject = history.find(p => p.id === updatingProjectId);
          if (!oldProject) return;
          const similarity = calculateSimilarity(oldProject.blocks, newParsed.blocks);
          
          if (similarity < 20) {
              // Trigger Custom Warning Modal instead of window.confirm
              setPendingUpdate({ parsed: newParsed, similarity, projectId: updatingProjectId });
          } else {
              processProjectUpdate(newParsed, updatingProjectId);
          }
      } catch (err) { showToast(t.errorGeneric, "error"); } finally { setUpdatingProjectId(null); if (updateInputRef.current) updateInputRef.current.value = ''; }
  };

  const processProjectUpdate = (newParsed: any, projectId: string) => {
      const oldProject = history.find(p => p.id === projectId);
      if (!oldProject) return;

      const mergedBlocks = mergeProjectBlocks(oldProject.blocks, newParsed.blocks);
      const updated = {
          ...oldProject, 
          blocks: mergedBlocks,
          metadata: { 
              ...oldProject.metadata, 
              title: newParsed.title || oldProject.metadata.title, 
              author: newParsed.author || oldProject.metadata.author,
              fandom: (newParsed.fandom && newParsed.fandom !== 'Unknown Fandom') ? newParsed.fandom : oldProject.metadata.fandom,
              tags: (newParsed.tags && newParsed.tags.length > 0) ? newParsed.tags : oldProject.metadata.tags,
              // IMPORTANT: Update URL if new parsing found one, otherwise keep old
              url: newParsed.url || oldProject.metadata.url
          },
          lastModified: Date.now()
      };
      
      setHistory(prev => prev.map(p => p.id === projectId ? updated : p));
      if (currentProject?.id === projectId) setCurrentProject(updated);
      showToast(t.updateSuccess, "success");
      setPendingUpdate(null);
  };

  const isCustomTheme = readingSettings.paperTheme === 'custom';
  const paperThemeClasses = React.useMemo(() => {
     // App.tsx handles provider, simplified here
     if (isCustomTheme) return 'text-gray-900 dark:text-gray-100'; 
     return 'bg-[#faf9f6] text-gray-900 dark:bg-[#1a1a1a] dark:text-gray-200'; // simplified
  }, [readingSettings.paperTheme, isCustomTheme]);

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
            isProcessing={isProcessing} onStart={handleStart} customApiKey={customApiKey}
        />
      );
    } else {
      return (
        <TranslationReader 
             key={currentProject.id}
             blocks={currentProject.blocks} displayMode={displayMode} fandom={currentProject.metadata.fandom} targetLang={currentProject.metadata.targetLanguage} 
             model={selectedModel} refinePromptTemplate={refinePromptTemplate} bookmarkBlockId={currentProject.bookmarkBlockId}
             title={currentProject.metadata.title} author={currentProject.metadata.author} url={currentProject.metadata.url} 
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
             onExport={handleExportCurrent} onContinue={handleStart} lang={uiLang} readingSettings={readingSettings} customApiKey={customApiKey}
        />
      );
    }
  };

  return (
      <div className={`min-h-screen font-sans transition-colors duration-300 relative`}>
        {/* Simplified Background handling to avoid duplication - just using the classes from readingSettings */}
        {isCustomTheme && readingSettings.customBgImage && (
            <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${readingSettings.customBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        )}
        {isCustomTheme && (
            <div className="fixed inset-0 z-[1] pointer-events-none" 
            style={{ 
                backgroundColor: theme === 'dark' 
                    ? `rgba(0,0,0,${readingSettings.overlayOpacity ?? 0.9})` 
                    : `rgba(255,255,255,${readingSettings.overlayOpacity ?? 0.9})`,
                backdropFilter: `blur(${readingSettings.overlayBlur ?? 0}px)` 
            }}></div>
        )}

        <div className="relative z-10">
            <input type="file" ref={updateInputRef} onChange={handleUpdateFileSelect} accept=".html,.htm,.txt" className="hidden" />
            <Navbar 
                uiLang={uiLang} setUiLang={setUiLang} 
                showFavorites={activeOverlay === 'favorites'} setShowFavorites={toggleFavorites} 
                showHistory={activeOverlay === 'history'} toggleHistory={toggleHistory}
                hasHistory={history.length > 0} currentProject={currentProject} displayMode={displayMode} setDisplayMode={setDisplayMode} 
                onHome={() => setActiveOverlay('history')} onOpenSettings={() => setShowProjectSettingsModal(true)} onSaveData={handleExportHistory}
            />
            
            <div className={`transition-all duration-300 ${activeOverlay !== 'none' ? 'scale-[0.98] opacity-50 overflow-hidden h-[calc(100vh-64px)]' : ''}`}>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderMainContent()}</main>
            </div>

            {activeOverlay === 'history' && (
            <HistoryPage 
                history={history} lang={uiLang} 
                onNavigateToProject={(p) => { setCurrentProject(p); closeOverlays(); }}
                onCreateNew={handleCreateNew}
                onTriggerUpdate={triggerUpdateProject}
                onUpdateFromUrl={(id, url) => handleUpdateFromUrl(id, url)}
                onDelete={deleteHistoryItem} 
                onClear={() => { setHistory([]); setCurrentProject(null); }}
                onImport={handleImportHistory} onExport={handleExportHistory} onClose={closeOverlays}
                readingSettings={readingSettings}
            />
            )}

            {activeOverlay === 'favorites' && (
                <FavoritesPage 
                    history={history} lang={uiLang} 
                    onNavigateToProject={(pid, bid) => { const p = history.find(x => x.id === pid); if(p) { setCurrentProject(p); handleSetBookmark(bid); closeOverlays(); }}}
                    onUpdateNote={(pid, bid, n) => handleUpdateNote(pid, bid, n)}
                    onRemoveFavorite={(pid, bid) => handleToggleFavorite(pid, bid)}
                    onExportBackup={handleExportHistory} onClose={closeOverlays} readingSettings={readingSettings}
                />
            )}

            <ProjectSettingsModal 
                uiLang={uiLang} isOpen={showProjectSettingsModal} onClose={() => setShowProjectSettingsModal(false)} onSave={handleSaveProjectSettings}
                fandom={currentProject?.metadata.fandom || detectedMeta?.fandom}
                settings={{ selectedModel, setSelectedModel, targetLang, setTargetLang, batchSize, setBatchSize, contextWindow, setContextWindow, customPrompt, setCustomPrompt, refinePromptTemplate, setRefinePromptTemplate, glossary, setGlossary, includeTags, setIncludeTags, tagInstruction, setTagInstruction, customApiKey, setCustomApiKey }}
                readingSettings={readingSettings} setReadingSettings={setReadingSettings}
                backupSettings={backupSettings} setBackupSettings={setBackupSettings} onBackupNow={handleExportHistory}
                onImportSettings={handleImportSettings}
                onRestorePrompt={() => { setCustomPrompt(DEFAULT_PROMPT); setRefinePromptTemplate(DEFAULT_REFINE_PROMPT); }}
            />

            {/* Custom Warning Modal for Low Similarity Updates */}
            {pendingUpdate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.updateWarningTitle}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t.updateWarningMsg.replace('{{percent}}', pendingUpdate.similarity.toString())}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-2">
                                <button 
                                    onClick={() => setPendingUpdate(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t.updateCancel}
                                </button>
                                <button 
                                    onClick={() => processProjectUpdate(pendingUpdate.parsed, pendingUpdate.projectId)}
                                    className="flex-1 px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-500/30 transition-colors"
                                >
                                    {t.updateConfirm}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
  );
};

const Main: React.FC = () => <ThemeProvider><ToastProvider><AppContent /></ToastProvider></ThemeProvider>;
export default Main;
