import React, { useState, useEffect, useRef } from 'react';
import { TranslationBlock, DisplayMode, AVAILABLE_MODELS } from '../types';
import { refineBlock } from '../services/geminiService';
import { RefreshCw, Edit2, Check, X, BookOpen, Heart, Bookmark, ArrowDown, FileText, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UI_STRINGS, LanguageCode } from '../services/i18n';

interface TranslationReaderProps {
  blocks: TranslationBlock[];
  displayMode: DisplayMode;
  fandom: string;
  targetLang: string;
  model: string;
  refinePromptTemplate?: string;
  bookmarkBlockId?: string;
  onUpdateBlock: (id: string, newTranslation: string) => void;
  onLoadingStateChange: (id: string, loading: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onSetBookmark: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  lang?: LanguageCode;
}

const TranslationReader: React.FC<TranslationReaderProps> = ({
  blocks,
  displayMode,
  fandom,
  targetLang,
  model,
  refinePromptTemplate,
  bookmarkBlockId,
  onUpdateBlock,
  onLoadingStateChange,
  onToggleFavorite,
  onSetBookmark,
  onUpdateNote,
  lang = 'en'
}) => {
  const t = UI_STRINGS[lang];
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Note editing state
  const [noteEditingBlockId, setNoteEditingBlockId] = useState<string | null>(null);
  
  // Refinement modal
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineModel, setRefineModel] = useState(model); // Local model selection for refinement

  // Scroll Tracking State
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleBlockIdRef = useRef<string | null>(null);

  // Intersection Observer for scroll tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
           visible.sort((a, b) => a.boundingClientRect.y - b.boundingClientRect.y);
           const target = visible[0];
           const id = target.target.getAttribute('data-block-id');
           if (id) visibleBlockIdRef.current = id;
        }
      },
      {
        root: null, 
        rootMargin: '-80px 0px -90% 0px', 
        threshold: 0
      }
    );

    const blockElements = document.querySelectorAll('.translation-block-item');
    blockElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [blocks, displayMode]);

  const scrollToBlock = (id: string) => {
      const element = document.getElementById(`block-${id}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  // Restore Scroll Position on load
  useEffect(() => {
    const targetId = visibleBlockIdRef.current || bookmarkBlockId;
    if (targetId) {
      setTimeout(() => {
        const element = document.getElementById(`block-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 50);
    }
  }, [displayMode, bookmarkBlockId]);

  const handleStartEdit = (block: TranslationBlock) => {
    setEditingBlockId(block.id);
    setEditText(block.translated);
    setRefiningBlockId(null);
  };

  const handleSaveEdit = () => {
    if (editingBlockId) {
      onUpdateBlock(editingBlockId, editText);
      setEditingBlockId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingBlockId(null);
  };

  const toggleRefine = (block: TranslationBlock) => {
      if (refiningBlockId === block.id) {
          setRefiningBlockId(null);
      } else {
          setRefiningBlockId(block.id);
          setRefineModel(model); // Reset to global model default when opening
      }
  };

  const handleRefine = async (block: TranslationBlock) => {
    if (!refineInstruction.trim()) return;
    onLoadingStateChange(block.id, true);
    setRefiningBlockId(null); 
    try {
      const template = refinePromptTemplate || "Refine this translation: {{original}} -> {{translated}} using instruction: {{instruction}}";
      const refined = await refineBlock(
        block.original, 
        block.translated, 
        targetLang, 
        fandom, 
        refineModel, // Use the locally selected model
        refineInstruction, 
        template
      );
      onUpdateBlock(block.id, refined);
    } catch (e) {
      alert("Failed to refine translation");
    } finally {
      onLoadingStateChange(block.id, false);
      setRefineInstruction('');
    }
  };

  const isTranslatedOnly = displayMode === DisplayMode.TRANSLATED_ONLY;
  const isSideBySide = displayMode === DisplayMode.SIDE_BY_SIDE;
  const isInterlinear = displayMode === DisplayMode.INTERLINEAR;

  const paragraphStyle = "text-lg md:text-xl font-serif-read text-gray-800 leading-relaxed indent-8 text-justify";
  const containerStyle = isTranslatedOnly 
    ? "max-w-[70ch] mx-auto px-4 py-8 space-y-4 bg-[#fdfbf7]" 
    : "divide-y divide-gray-100";

  const renderBlock = (block: TranslationBlock) => {
    const isEditing = editingBlockId === block.id;
    const isRefining = refiningBlockId === block.id;
    const isEditingNote = noteEditingBlockId === block.id;
    const showOriginal = displayMode === DisplayMode.SIDE_BY_SIDE;
    const isBookmarked = bookmarkBlockId === block.id;

    // We define the content inline to avoid React remounting the component on every keystroke
    const contentJsx = (
        <>
            {isEditing ? (
                <div className="flex flex-col gap-2 relative z-20">
                    <textarea 
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-serif-read text-lg text-gray-800 bg-white shadow-sm leading-relaxed"
                    rows={Math.max(3, Math.ceil(block.translated.length / 40))}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                    <button onClick={handleCancelEdit} className="p-1 hover:bg-gray-200 rounded text-gray-500"><X className="w-4 h-4"/></button>
                    <button onClick={handleSaveEdit} className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded"><Check className="w-4 h-4"/></button>
                    </div>
                </div>
            ) : (
                <div 
                    className={`font-serif-read text-gray-900 leading-relaxed text-lg md:text-xl text-justify whitespace-pre-line ${block.isEdited ? 'decoration-blue-200/50 decoration-2 underline-offset-4' : ''}`}
                    onClick={isTranslatedOnly ? () => handleStartEdit(block) : undefined}
                >
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p {...props} className={isTranslatedOnly ? "inline" : "mb-0"} /> }}>
                        {block.translated}
                    </ReactMarkdown>
                </div>
            )}
            
            {/* Note Display/Edit Area */}
            {(block.note || isEditingNote) && (
                <div className={`mt-3 p-3 rounded-lg border text-sm ${isEditingNote ? 'bg-white border-yellow-300 shadow-sm' : 'bg-yellow-50 border-yellow-100 text-gray-700'}`}>
                    {isEditingNote ? (
                        <div className="flex flex-col gap-2">
                            <textarea 
                                autoFocus
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-400"
                                placeholder={t.notePlaceholder}
                                value={block.note || ''}
                                onChange={(e) => onUpdateNote(block.id, e.target.value)}
                                onBlur={() => setNoteEditingBlockId(null)}
                            />
                            <div className="flex justify-end">
                                <button onMouseDown={(e) => { e.preventDefault(); setNoteEditingBlockId(null); }} className="text-xs text-yellow-700 font-medium hover:underline">Done</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-start group/note cursor-pointer" onClick={() => setNoteEditingBlockId(block.id)}>
                            <FileText className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="flex-1">{block.note}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    // TRANSLATED ONLY MODE
    if (isTranslatedOnly && !isEditing && !isRefining && !block.isLoading) {
       return (
         <div 
           key={block.id}
           id={`block-${block.id}`}
           data-block-id={block.id}
           className={`translation-block-item relative group hover:bg-[#f8f5f0] transition-all rounded px-2 -mx-2 border-l-4 scroll-mt-28 ${isBookmarked ? 'border-red-800 bg-red-50/30' : 'border-transparent'}`}
         >
            {isBookmarked && (
                <div className="absolute -left-6 top-1 text-red-800" title={t.readingBookmark}>
                    <Bookmark className="w-4 h-4 fill-current" />
                </div>
            )}
           
           <div className={paragraphStyle}>
                {contentJsx}
           </div>
           
           {/* Horizontal Toolbar for Translated Only Mode - Positioned to the RIGHT GUTTER */}
           <div className="absolute left-[100%] top-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-row gap-1 z-30 bg-white/50 backdrop-blur-sm shadow-sm border border-gray-100 rounded-lg px-2 py-1.5 h-fit whitespace-nowrap">
              <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(block.id); }} title={t.actionFavorite} className={`p-1.5 rounded-full hover:bg-white hover:shadow-sm hover:text-red-500 ${block.isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
                  <Heart className={`w-3.5 h-3.5 ${block.isFavorite ? 'fill-current' : ''}`}/>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setNoteEditingBlockId(isEditingNote ? null : block.id); }} title={t.actionNote} className={`p-1.5 rounded-full hover:bg-white hover:shadow-sm hover:text-yellow-600 ${block.note ? 'text-yellow-600' : 'text-gray-400'}`}>
                  <FileText className={`w-3.5 h-3.5 ${block.note ? 'fill-current' : ''}`}/>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onSetBookmark(block.id); }} title={t.actionBookmark} className={`p-1.5 rounded-full hover:bg-white hover:shadow-sm hover:text-[#990000] ${isBookmarked ? 'text-[#990000]' : 'text-gray-400'}`}>
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`}/>
              </button>
              <div className="w-px h-4 bg-gray-300 my-auto mx-0.5"></div>
              <button onClick={(e) => { e.stopPropagation(); toggleRefine(block); }} title={t.actionRefine} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm text-gray-400 hover:text-indigo-600">
                  <RefreshCw className="w-3.5 h-3.5"/>
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleStartEdit(block); }} title={t.actionEdit} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-600">
                  <Edit2 className="w-3.5 h-3.5"/>
              </button>
           </div>
           
           {/* Refine Popover (In Translated Only Mode) */}
           {isRefining && (
               <div className="absolute right-0 top-8 z-40 w-full md:w-96 p-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-indigo-100 p-4 ring-1 ring-black/5">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                            {t.refineHeader}
                        </h4>
                        <select 
                            value={refineModel}
                            onChange={(e) => setRefineModel(e.target.value)}
                            className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                        >
                            {AVAILABLE_MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.name.split('(')[0]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                            placeholder={t.refinePlaceholder}
                            value={refineInstruction}
                            onChange={(e) => setRefineInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefine(block)}
                            autoFocus
                        />
                        <button 
                            onClick={() => handleRefine(block)} 
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                        >
                            {t.refineButton}
                        </button>
                    </div>
                  </div>
               </div>
           )}

         </div>
       );
    }

    // SPLIT / INTERLINEAR MODES
    return (
      <div 
        key={block.id}
        id={`block-${block.id}`}
        data-block-id={block.id}
        className={`translation-block-item group relative transition-colors p-4 md:p-6 scroll-mt-28 ${isTranslatedOnly ? 'rounded-lg border border-gray-200 shadow-sm my-4 bg-white' : ''} ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isBookmarked ? 'ring-2 ring-red-100 bg-red-50/10' : ''}`}
      >
        {isBookmarked && <div className="absolute -left-1 top-6 w-1 h-8 bg-[#990000] rounded-r"></div>}

        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
          <button onClick={() => onToggleFavorite(block.id)} className={`p-1.5 bg-white border border-gray-200 rounded-full shadow hover:text-red-500 ${block.isFavorite ? 'text-red-500' : 'text-gray-400'}`} title={t.actionFavorite}>
            <Heart className={`w-3 h-3 ${block.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => setNoteEditingBlockId(isEditingNote ? null : block.id)} className={`p-1.5 bg-white border border-gray-200 rounded-full shadow hover:text-yellow-600 ${block.note ? 'text-yellow-600' : 'text-gray-400'}`} title={t.actionNote}>
            <FileText className={`w-3 h-3 ${block.note ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => onSetBookmark(block.id)} className={`p-1.5 bg-white border border-gray-200 rounded-full shadow hover:text-[#990000] ${isBookmarked ? 'text-[#990000]' : 'text-gray-400'}`} title={t.actionBookmark}>
            <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => toggleRefine(block)} className={`p-1.5 bg-white border border-gray-200 rounded-full shadow hover:text-indigo-600 ${isRefining ? 'text-indigo-600 ring-2 ring-indigo-200' : 'text-gray-500'}`} title={t.actionRefine}>
            <RefreshCw className="w-3 h-3" />
          </button>
          <button onClick={() => handleStartEdit(block)} className="p-1.5 bg-white border border-gray-200 rounded-full shadow hover:text-blue-600 text-gray-500" title={t.actionEdit}>
            <Edit2 className="w-3 h-3" />
          </button>
        </div>

        {isRefining && (
          <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-inner animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-indigo-800 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.refineModelLabel}
                </p>
                <select 
                    value={refineModel}
                    onChange={(e) => setRefineModel(e.target.value)}
                    className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1 text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                >
                    {AVAILABLE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name.split('(')[0]}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={refineInstruction} 
                onChange={(e) => setRefineInstruction(e.target.value)} 
                placeholder={t.refinePlaceholder} 
                className="flex-1 text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none" 
                onKeyDown={(e) => e.key === 'Enter' && handleRefine(block)}
                autoFocus
            />
              <button 
                onClick={() => handleRefine(block)} 
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
            >
                {t.refineButton}
            </button>
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${isSideBySide ? 'md:grid-cols-2 items-start' : 'grid-cols-1'}`}>
          {(showOriginal || isInterlinear) && (
            <div className={`${isSideBySide ? 'bg-gray-50/50 p-4 rounded-lg border border-gray-100 text-sm md:text-base leading-relaxed text-gray-600' : 'text-gray-500 text-sm mb-2 border-l-2 border-gray-200 pl-3'} font-serif-read text-justify select-text`}>
               {block.original}
            </div>
          )}
          <div className={`relative ${isSideBySide ? 'p-2' : ''}`}>
             {block.isLoading ? (
               <div className="animate-pulse space-y-3 py-2">
                 <div className="h-2 bg-gray-200 rounded w-full"></div>
                 <div className="h-2 bg-gray-200 rounded w-5/6"></div>
               </div>
             ) : (
                contentJsx
             )}
          </div>
        </div>
      </div>
    );
  };

  // REMOVED overflow-hidden from the main container below to allow tooltips to spill out if needed,
  // though the new horizontal layout keeps them contained better.
  return (
    <div ref={containerRef} className={`mx-auto bg-white shadow-sm min-h-[60vh] rounded-xl border border-gray-100 transition-all duration-300 ${isTranslatedOnly ? 'bg-[#fdfbf7] border-none shadow-none' : 'max-w-7xl'}`}>
      
      {/* Floating Action Button for Bookmark */}
      {bookmarkBlockId && (
          <button 
            onClick={() => scrollToBlock(bookmarkBlockId)}
            className="fixed bottom-8 right-8 z-50 bg-[#990000] text-white p-3 rounded-full shadow-lg shadow-red-900/20 hover:bg-[#800000] hover:scale-105 transition-all flex items-center gap-2 pr-4 animate-in fade-in slide-in-from-bottom-4"
          >
             <Bookmark className="w-5 h-5 fill-current" />
             <span className="font-bold text-sm">{t.jumpToBookmark}</span>
          </button>
      )}

      <div className={containerStyle}>
         {blocks.map(renderBlock)}
      </div>
      
      {blocks.length === 0 && (
        <div className="p-12 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No content to display.</p>
        </div>
      )}
    </div>
  );
};

export default TranslationReader;