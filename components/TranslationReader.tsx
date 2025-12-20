
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TranslationBlock, DisplayMode, AVAILABLE_MODELS } from '../types';
import { refineBlock } from '../services/geminiService';
import { Edit2, Check, X, BookOpen, Heart, Bookmark, FileText, Sparkles, ArrowUp, List, ChevronLeft, ChevronRight, Upload, Heading, FileDown, Play, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import Tooltip from './Tooltip';

// --- Types ---
interface TranslationReaderProps {
  blocks: TranslationBlock[];
  displayMode: DisplayMode;
  fandom: string;
  targetLang: string;
  model: string;
  refinePromptTemplate?: string;
  bookmarkBlockId?: string;
  title: string;          
  author: string;         
  percentComplete: number; 
  isProcessing: boolean;   
  onUpdateBlock: (id: string, newTranslation: string) => void;
  onLoadingStateChange: (id: string, loading: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onSetBookmark: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onToggleBlockType: (id: string) => void; 
  onOpenSettings: () => void;
  onUpdateSource: () => void;
  onExport: (format: 'markdown' | 'html') => void; 
  onContinue: () => void; 
  lang?: LanguageCode;
}

// --- BLOCK ITEM COMPONENT ---
interface BlockItemProps {
  block: TranslationBlock;
  displayMode: DisplayMode;
  isBookmarked: boolean;
  isEditing: boolean;
  isRefining: boolean;
  isEditingNote: boolean;
  onStartEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, text: string) => void;
  onToggleRefine: (id: string) => void;
  onToggleNote: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onToggleFavorite: (id: string) => void;
  onSetBookmark: (id: string) => void;
  onToggleBlockType: (id: string) => void;
  onRefine: (id: string, instruction: string, model: string) => void;
  t: any;
}

const TranslationBlockItem = React.memo(({
  block, displayMode, isBookmarked, isEditing, isRefining, isEditingNote,
  onStartEdit, onCancelEdit, onSaveEdit, onToggleRefine, onToggleNote, onUpdateNote,
  onToggleFavorite, onSetBookmark, onToggleBlockType, onRefine, t
}: BlockItemProps) => {
  const [localEditText, setLocalEditText] = useState(block.translated);
  const [localNote, setLocalNote] = useState(block.note || '');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineModel, setRefineModel] = useState(AVAILABLE_MODELS[0].id);

  useEffect(() => { setLocalEditText(block.translated); }, [block.translated]);
  useEffect(() => { setLocalNote(block.note || ''); }, [block.note]);

  const handleSave = () => onSaveEdit(block.id, localEditText);
  const handleRefineSubmit = () => onRefine(block.id, refineInstruction, refineModel);
  const handleNoteSave = () => onUpdateNote(block.id, localNote);

  const isTranslatedOnly = displayMode === DisplayMode.TRANSLATED_ONLY;
  const isSideBySide = displayMode === DisplayMode.SIDE_BY_SIDE;
  const isInterlinear = displayMode === DisplayMode.INTERLINEAR;
  const showOriginal = displayMode === DisplayMode.SIDE_BY_SIDE;

  // Render Logic based on Type
  if (block.type === 'separator') {
      return <hr className="my-8 border-gray-300 dark:border-gray-700 w-1/2 mx-auto" />;
  }

  const cleanHeader = (text: string) => text.replace(/^[#\s]+/, '');

  const HeaderContent = () => (
      <div id={`block-${block.id}`} className="mt-12 mb-8 text-center scroll-mt-36 group relative">
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip content={t.convertToText}>
                  <button onClick={() => onToggleBlockType(block.id)} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white">
                      <Heading className="w-4 h-4" />
                  </button>
              </Tooltip>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#990000] dark:text-red-400 mb-2 cursor-pointer" onClick={() => onStartEdit(block.id, block.translated)}>
              {cleanHeader(block.translated || block.original)}
          </h2>
          {isSideBySide && block.translated && (
              <p className="text-sm text-gray-400 font-serif italic">{cleanHeader(block.original)}</p>
          )}
      </div>
  );

  if (block.type === 'header') {
      return isEditing ? (
        <div className="max-w-xl mx-auto mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
             <input className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 font-serif text-2xl font-bold text-[#990000] outline-none mb-2" value={localEditText} onChange={(e) => setLocalEditText(e.target.value)} autoFocus />
             <div className="flex gap-2 justify-end">
                <button onClick={onCancelEdit} className="text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleSave} className="text-xs font-bold text-blue-500">Save</button>
             </div>
        </div>
      ) : <HeaderContent />;
  }

  // Standard Text Styling
  const paragraphStyle = "text-lg md:text-xl font-serif text-gray-800 dark:text-gray-300 leading-loose indent-8 text-justify transition-colors duration-300";

  const Toolbar = () => (
    <div className="flex items-center justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ opacity: (isRefining || isEditing || isEditingNote) ? 1 : undefined }}>
       <Tooltip content={block.type === 'header' ? t.convertToText : t.convertToHeader}>
        <button onClick={(e) => { e.stopPropagation(); onToggleBlockType(block.id); }} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${block.type === 'header' ? 'text-[#990000]' : 'text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-200'}`}>
            <Heading className="w-3.5 h-3.5"/>
        </button>
      </Tooltip>
      <Tooltip content={t.actionFavorite}>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(block.id); }} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${block.isFavorite ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-500'}`}>
            <Heart className={`w-3.5 h-3.5 ${block.isFavorite ? 'fill-current' : ''}`}/>
        </button>
      </Tooltip>
      <Tooltip content={t.actionNote}>
        <button onClick={(e) => { e.stopPropagation(); onToggleNote(block.id); }} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${block.note ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-500'}`}>
            <FileText className={`w-3.5 h-3.5 ${block.note ? 'fill-current' : ''}`}/>
        </button>
      </Tooltip>
      <Tooltip content={t.actionRefine}>
        <button onClick={(e) => { e.stopPropagation(); onToggleRefine(block.id); }} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isRefining ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500'}`}>
            <Sparkles className="w-3.5 h-3.5"/>
        </button>
      </Tooltip>
      <Tooltip content={t.actionEdit}>
        <button onClick={(e) => { e.stopPropagation(); onStartEdit(block.id, block.translated); }} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isEditing ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600 hover:text-blue-500'}`}>
            <Edit2 className="w-3.5 h-3.5"/>
        </button>
      </Tooltip>
      <Tooltip content={t.actionBookmark}>
        <button onClick={(e) => { e.stopPropagation(); onSetBookmark(block.id); }} className={`p-1.5 rounded transition-colors ${isBookmarked ? 'text-[#990000]' : 'text-gray-300 dark:text-gray-600 hover:text-[#990000] hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`}/>
        </button>
      </Tooltip>
    </div>
  );

  const RefinePopover = () => (
    <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-inner animate-in fade-in slide-in-from-top-1">
      <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> {t.refineModelLabel}
          </p>
          <select value={refineModel} onChange={(e) => setRefineModel(e.target.value)} className="text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
              {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name.split('(')[0]}</option>)}
          </select>
      </div>
      <div className="flex gap-2">
        <input type="text" value={refineInstruction} onChange={(e) => setRefineInstruction(e.target.value)} placeholder={t.refinePlaceholder} className="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()} autoFocus />
        <button onClick={handleRefineSubmit} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-md transition-all">{t.refineButton}</button>
      </div>
    </div>
  );

  const ContentJsx = (
    <>
      {isEditing ? (
        <div className="relative w-full">
            <textarea className="w-full bg-white dark:bg-gray-800 p-4 border border-blue-200 dark:border-blue-900 rounded-xl outline-none font-serif text-lg md:text-xl text-gray-900 dark:text-gray-100 leading-loose resize-none shadow-sm focus:ring-2 focus:ring-blue-500/10 transition-all" style={{ minHeight: '150px' }} rows={Math.max(3, Math.ceil(block.translated.length / 50))} value={localEditText} onChange={(e) => setLocalEditText(e.target.value)} autoFocus />
            <div className="flex gap-2 justify-end mt-2">
              <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X className="w-4 h-4 inline mr-1"/> Cancel</button>
              <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all"><Check className="w-4 h-4 inline mr-1"/> Save</button>
            </div>
        </div>
      ) : (
        <div className={`font-serif text-gray-900 dark:text-gray-200 leading-loose text-lg md:text-xl text-justify whitespace-pre-line transition-colors duration-300 ${isTranslatedOnly ? 'cursor-text' : ''} ${block.isEdited ? 'decoration-blue-300/50 dark:decoration-blue-700/50 decoration-2 underline-offset-4' : ''}`} onClick={isTranslatedOnly ? () => onStartEdit(block.id, block.translated) : undefined}>
            <ReactMarkdown components={{ p: ({node, ...props}) => <p {...props} className={isTranslatedOnly ? "inline" : "mb-0"} /> }}>{block.translated}</ReactMarkdown>
        </div>
      )}
      {(block.note || isEditingNote) && (
        <div className={`mt-4 p-4 rounded-xl border text-sm transition-colors duration-300 ${isEditingNote ? 'bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600/50 shadow-lg' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30 text-gray-700 dark:text-gray-300'}`}>
            {isEditingNote ? (
                <div className="flex flex-col gap-3">
                    <textarea autoFocus className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-800 dark:text-gray-200 placeholder-gray-400 font-sans" placeholder={t.notePlaceholder} value={localNote} onChange={(e) => setLocalNote(e.target.value)} onBlur={handleNoteSave} rows={2} />
                    <div className="flex justify-end"><button onMouseDown={(e) => { e.preventDefault(); handleNoteSave(); }} className="text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:underline uppercase tracking-wider">Done</button></div>
                </div>
            ) : (
                <div className="flex gap-3 items-start group/note cursor-pointer" onClick={() => onToggleNote(block.id)}><FileText className="w-4 h-4 text-yellow-500 dark:text-yellow-400 shrink-0 mt-1" /><p className="flex-1 italic font-sans">{block.note}</p></div>
            )}
        </div>
      )}
    </>
  );

  if (isTranslatedOnly && !block.isLoading) {
    return (
      <div id={`block-${block.id}`} data-block-id={block.id} className={`translation-block-item group transition-all rounded-lg scroll-mt-32 ${isBookmarked ? 'border-l-4 border-[#990000] pl-4 -ml-5 bg-red-50/50 dark:bg-red-900/10 py-2' : ''}`}>
        {isBookmarked && <div className="absolute -left-10 top-1 text-[#990000]"><Bookmark className="w-5 h-5 fill-current" /></div>}
        <Toolbar />
        {isRefining && <RefinePopover />}
        <div className={paragraphStyle}>{ContentJsx}</div>
      </div>
    );
  }

  return (
    <div id={`block-${block.id}`} data-block-id={block.id} className={`translation-block-item group transition-colors p-6 scroll-mt-32 ${isTranslatedOnly ? 'rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm my-6 bg-white dark:bg-[#1e1e1e]' : ''} ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'} ${isBookmarked ? 'ring-2 ring-red-100 dark:ring-red-900/30 bg-red-50/20' : ''}`}>
      {isBookmarked && <div className="absolute -left-[1px] top-6 w-1 h-8 bg-[#990000] rounded-r"></div>}
      <Toolbar />
      {isRefining && <RefinePopover />}
      <div className={`grid gap-8 ${isSideBySide ? 'md:grid-cols-2 items-start' : 'grid-cols-1'}`}>
        {(showOriginal || isInterlinear) && (
          <div className={`${isSideBySide ? 'bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 text-base leading-relaxed text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400 text-sm mb-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4'} font-serif text-justify select-text`}>
             <p lang="en">{block.original}</p>
          </div>
        )}
        <div className="relative notranslate">
           {block.isLoading ? (
             <div className="animate-pulse space-y-4 py-2"><div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div><div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-5/6"></div><div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-4/6"></div></div>
           ) : ContentJsx}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.block.id === next.block.id &&
    prev.block.translated === next.block.translated &&
    prev.block.note === next.block.note &&
    prev.block.isFavorite === next.block.isFavorite &&
    prev.block.isLoading === next.block.isLoading &&
    prev.block.type === next.block.type && 
    prev.displayMode === next.displayMode &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isEditing === next.isEditing &&
    prev.isRefining === next.isRefining &&
    prev.isEditingNote === next.isEditingNote
  );
});

// --- MAIN PARENT COMPONENT ---
const TranslationReader: React.FC<TranslationReaderProps> = ({
  blocks, displayMode, fandom, targetLang, model, refinePromptTemplate, bookmarkBlockId,
  title, author, percentComplete, isProcessing,
  onUpdateBlock, onLoadingStateChange, onToggleFavorite, onSetBookmark, onUpdateNote, onToggleBlockType, onOpenSettings, onUpdateSource, onExport, onContinue, lang = 'en'
}) => {
  const t = UI_STRINGS[lang];
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [noteEditingBlockId, setNoteEditingBlockId] = useState<string | null>(null);
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  
  // Chapter Navigation State
  const [showToc, setShowToc] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Group Chapters with Filter
  const chapters = useMemo(() => {
     const chs: {index: number, title: string, startBlockId: string}[] = [];
     let lastIndex = -1;
     
     const clean = (txt: string) => txt.replace(/^[#\s]+/, '');
     
     blocks.forEach(b => {
         const idx = b.chapterIndex !== undefined ? b.chapterIndex : 0;
         
         // Only treat as a new chapter in TOC if it's explicitly marked as header
         // OR if the index changes (legacy safety)
         if (idx !== lastIndex) {
             const headerText = b.type === 'header' ? clean(b.translated || b.original) : `Chapter ${idx + 1}`;
             
             // TOC Cleanup: Skip headers that are likely misidentified dialogue (too long)
             if (headerText.length < 50) {
                 chs.push({
                     index: idx,
                     title: headerText,
                     startBlockId: b.id
                 });
             }
             lastIndex = idx;
         } else if (b.type === 'header' && chs.length > 0 && chs[chs.length-1].index === idx) {
             const refinedTitle = clean(b.translated || b.original);
             // Update title only if it looks like a real title (short)
             if (refinedTitle.length < 50) {
                chs[chs.length-1].title = refinedTitle;
             }
         }
     });
     
     if (chs.length === 0 && blocks.length > 0) return [{index: 0, title: "Start", startBlockId: blocks[0].id}];
     return chs;
  }, [blocks]);

  const displayedBlocks = useMemo(() => {
      return blocks.filter(b => (b.chapterIndex || 0) === currentChapterIdx);
  }, [blocks, currentChapterIdx]);

  // Handle Initial Load / Bookmark Logic
  useEffect(() => {
    // This runs once when component mounts (due to key={id} in parent)
    if (bookmarkBlockId) {
        const bookmarkedBlock = blocks.find(b => b.id === bookmarkBlockId);
        if (bookmarkedBlock && bookmarkedBlock.chapterIndex !== undefined) {
            // 1. Set Chapter
            setCurrentChapterIdx(bookmarkedBlock.chapterIndex);
            
            // 2. Scroll to block (with slight delay for render)
            setTimeout(() => {
                const el = document.getElementById(`block-${bookmarkBlockId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Visual cue
                    el.classList.add('ring-2', 'ring-[#990000]', 'ring-offset-2');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-[#990000]', 'ring-offset-2'), 2000);
                }
            }, 300);
        }
    } else {
        setCurrentChapterIdx(0);
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []); // Run on mount

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const handleStartEdit = useCallback((id: string) => { setEditingBlockId(id); setRefiningBlockId(null); }, []);
  const handleCancelEdit = useCallback(() => setEditingBlockId(null), []);
  const handleSaveEdit = useCallback((id: string, text: string) => { onUpdateBlock(id, text); setEditingBlockId(null); }, [onUpdateBlock]);
  const handleToggleRefine = useCallback((id: string) => setRefiningBlockId(prev => prev === id ? null : id), []);
  const handleToggleNote = useCallback((id: string) => setNoteEditingBlockId(prev => prev === id ? null : id), []);
  const handleUpdateNoteLocal = useCallback((id: string, note: string) => { onUpdateNote(id, note); setNoteEditingBlockId(null); }, [onUpdateNote]);
  
  const handleRefine = useCallback(async (id: string, instruction: string, modelToUse: string) => {
      const block = blocks.find(b => b.id === id);
      if (!block || !instruction.trim()) return;
      onLoadingStateChange(id, true);
      setRefiningBlockId(null);
      try {
          const template = refinePromptTemplate || "Refine this translation: {{original}} -> {{translated}} using instruction: {{instruction}}";
          const refined = await refineBlock(block.original, block.translated, targetLang, fandom, modelToUse, instruction, template);
          onUpdateBlock(id, refined);
      } catch (e) { alert("Refinement failed"); }
      finally { onLoadingStateChange(id, false); }
  }, [blocks, refinePromptTemplate, targetLang, fandom, onLoadingStateChange, onUpdateBlock]);

  function isTranslatedOnly(mode: DisplayMode) { return mode === DisplayMode.TRANSLATED_ONLY; }

  return (
    <div ref={containerRef} className={`mx-auto rounded-3xl transition-all duration-300 ${isTranslatedOnly(displayMode) ? 'bg-[#fdfbf7] dark:bg-[#1e1e1e] border-none shadow-none' : 'max-w-7xl bg-white dark:bg-[#1a1a1a] shadow-sm border border-gray-100 dark:border-gray-800'}`}>
      
      {/* --- HEADER SECTION (SCROLLS WITH CONTENT) --- */}
      <div className="bg-white dark:bg-[#252525] border-b border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-t-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
              <h1 className="font-serif font-black text-2xl md:text-3xl text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">{title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <span>{author}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="truncate max-w-[200px]">{fandom}</span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              {percentComplete < 100 && (
                   <Tooltip content={t.resume}>
                      <button 
                          onClick={onContinue} 
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#990000] text-white rounded-xl font-bold text-sm shadow-lg shadow-red-900/20 hover:bg-[#800000] disabled:opacity-50 transition-all"
                      >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current"/>}
                          {isProcessing ? t.translating : t.resume}
                      </button>
                   </Tooltip>
              )}

              <Tooltip content={t.exportMD}>
                  <button 
                      onClick={() => onExport('markdown')} 
                      className="p-2.5 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-100 dark:border-gray-700"
                  >
                      <FileDown className="w-5 h-5" />
                  </button>
              </Tooltip>
          </div>
      </div>

      {/* Floating Dock */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
        <Tooltip content={t.scrollTop} position="left">
            <button onClick={scrollToTop} className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full shadow-lg text-gray-500 hover:text-[#990000] dark:hover:text-white transition-all hover:-translate-y-1">
                <ArrowUp className="w-5 h-5" />
            </button>
        </Tooltip>

        {bookmarkBlockId && (
            <Tooltip content={t.jumpToBookmark} position="left">
                <button onClick={() => {
                    const b = blocks.find(bl => bl.id === bookmarkBlockId);
                    if(b && b.chapterIndex !== undefined) {
                        setCurrentChapterIdx(b.chapterIndex);
                        setTimeout(() => document.getElementById(`block-${bookmarkBlockId}`)?.scrollIntoView({behavior:'smooth', block:'center'}), 100);
                    }
                }} className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full shadow-lg text-[#990000] dark:text-red-400 hover:scale-110 transition-all">
                    <Bookmark className="w-5 h-5 fill-current" />
                </button>
            </Tooltip>
        )}

        <Tooltip content={t.updateSourceDesc} position="left">
            <button onClick={onUpdateSource} className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full shadow-lg text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white transition-all hover:scale-105">
                <Upload className="w-5 h-5" />
            </button>
        </Tooltip>

        {chapters.length > 0 && (
            <Tooltip content={t.toc} position="left">
                <button onClick={() => setShowToc(!showToc)} className={`p-3 backdrop-blur border rounded-full shadow-lg transition-all ${showToc ? 'bg-[#990000] border-[#990000] text-white' : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-[#990000]'}`}>
                    <List className="w-5 h-5" />
                </button>
            </Tooltip>
        )}
      </div>

      {/* Chapter TOC Sidebar */}
      {showToc && (
        <div className="fixed top-20 right-4 sm:right-8 w-64 max-h-[70vh] bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
           <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
             <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2"><List className="w-4 h-4"/> {t.toc}</h3>
             <button onClick={() => setShowToc(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
           </div>
           <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
             {chapters.map((ch) => (
               <button 
                  key={ch.index} 
                  onClick={() => { setCurrentChapterIdx(ch.index); setShowToc(false); scrollToTop(); }} 
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs md:text-sm transition-colors flex items-center gap-2 group ${currentChapterIdx === ch.index ? 'bg-[#990000] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
               >
                 <span className="line-clamp-1 font-serif">{ch.title}</span>
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Blocks List */}
      <div className={isTranslatedOnly(displayMode) ? "max-w-[70ch] mx-auto px-6 py-10 space-y-6 bg-[#fdfbf7] dark:bg-[#1e1e1e] shadow-sm dark:shadow-none min-h-screen transition-colors duration-300 pb-32" : "divide-y divide-gray-100 dark:divide-gray-800 pb-32"}>
         {displayedBlocks.map(block => (
           <TranslationBlockItem 
             key={block.id}
             block={block}
             displayMode={displayMode}
             isBookmarked={bookmarkBlockId === block.id}
             isEditing={editingBlockId === block.id}
             isRefining={refiningBlockId === block.id}
             isEditingNote={noteEditingBlockId === block.id}
             onStartEdit={handleStartEdit}
             onCancelEdit={handleCancelEdit}
             onSaveEdit={handleSaveEdit}
             onToggleRefine={handleToggleRefine}
             onToggleNote={handleToggleNote}
             onUpdateNote={handleUpdateNoteLocal}
             onToggleFavorite={onToggleFavorite}
             onSetBookmark={onSetBookmark}
             onToggleBlockType={onToggleBlockType}
             onRefine={handleRefine}
             t={t}
           />
         ))}
      </div>

      {/* Pagination Controls */}
      <div className="py-8 px-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button 
            onClick={() => { setCurrentChapterIdx(Math.max(0, currentChapterIdx - 1)); scrollToTop(); }}
            disabled={currentChapterIdx === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-bold transition-colors ${currentChapterIdx === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
              <ChevronLeft className="w-4 h-4" /> {t.previousChapter}
          </button>
          
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {t.chapterXofY.replace('{{current}}', (currentChapterIdx + 1).toString()).replace('{{total}}', chapters.length.toString())}
          </div>

          <button 
            onClick={() => { setCurrentChapterIdx(Math.min(chapters.length - 1, currentChapterIdx + 1)); scrollToTop(); }}
            disabled={currentChapterIdx >= chapters.length - 1}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white shadow-md text-sm font-bold transition-colors ${currentChapterIdx >= chapters.length - 1 ? 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed text-gray-500' : 'bg-[#990000] hover:bg-[#800000]'}`}
          >
              {t.nextChapter} <ChevronRight className="w-4 h-4" />
          </button>
      </div>
      
      {displayedBlocks.length === 0 && <div className="p-20 text-center text-gray-300 dark:text-gray-700 flex flex-col items-center justify-center min-h-[400px]"><BookOpen className="w-16 h-16 mb-4 opacity-20" /><p className="text-lg font-medium">{t.noContent}</p></div>}
    </div>
  );
};

export default TranslationReader;
