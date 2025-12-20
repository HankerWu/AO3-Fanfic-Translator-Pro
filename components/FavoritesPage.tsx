
import React, { useState, useMemo } from 'react';
import { TranslationProject, ReadingSettings } from '../types';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { Heart, FileText, ArrowRight, Trash2, X, FileDown, Archive, Quote, Search, Filter } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Tooltip from './Tooltip';
import { useTheme } from './ThemeContext';

interface FavoritesPageProps {
  history: TranslationProject[];
  lang: LanguageCode;
  onNavigateToProject: (projectId: string, blockId: string) => void;
  onUpdateNote: (projectId: string, blockId: string, note: string) => void;
  onRemoveFavorite: (projectId: string, blockId: string) => void;
  onExportBackup: () => void;
  onClose: () => void;
  readingSettings: ReadingSettings;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({
  history,
  lang,
  onNavigateToProject,
  onUpdateNote,
  onRemoveFavorite,
  onExportBackup,
  onClose,
  readingSettings
}) => {
  const t = UI_STRINGS[lang];
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFandom, setFilterFandom] = useState('ALL');

  // Aggregate all favorites
  const allFavorites = useMemo(() => history.flatMap(project => 
    project.blocks
      .filter(b => b.isFavorite)
      .map(b => ({
        block: b,
        projectMeta: project.metadata,
        projectId: project.id
      }))
  ), [history]);

  // Derived Fandom List (Split by comma)
  const fandoms = useMemo(() => {
    const fs = new Set<string>();
    allFavorites.forEach(item => {
        const rawFandom = item.projectMeta.fandom || t.unknownFandom;
        rawFandom.split(',').forEach(f => fs.add(f.trim()));
    });
    return Array.from(fs).sort();
  }, [allFavorites, t.unknownFandom]);

  // Filtering Logic
  const filteredFavorites = useMemo(() => {
     return allFavorites.filter(item => {
         // Search
         const query = searchTerm.toLowerCase();
         const matchSearch = 
            item.projectMeta.title.toLowerCase().includes(query) ||
            item.block.original.toLowerCase().includes(query) ||
            item.block.translated.toLowerCase().includes(query) ||
            (item.block.note && item.block.note.toLowerCase().includes(query));
         
         // Fandom
         const matchFandom = filterFandom === 'ALL' || (item.projectMeta.fandom && item.projectMeta.fandom.includes(filterFandom));

         return matchSearch && matchFandom;
     });
  }, [allFavorites, searchTerm, filterFandom]);

  // --- Theme Logic (Matching App.tsx) ---
  const isCustomTheme = readingSettings.paperTheme === 'custom';
  const paperThemeClasses = useMemo(() => {
     if (isCustomTheme) return 'text-gray-900 dark:text-gray-100'; 

     if (theme === 'dark') {
         if (readingSettings.paperTheme === 'midnight') return 'bg-[#1e293b] text-[#e2e8f0]';
         return 'bg-[#1a1a1a] text-gray-200';
     }

     switch(readingSettings.paperTheme) {
         case 'sepia': return 'bg-[#fdfbf7] text-[#5f4b32]';
         case 'green': return 'bg-[#f0fdf4] text-[#14532d]';
         case 'gray': return 'bg-[#f3f4f6] text-[#1f2937]';
         case 'midnight': return 'bg-[#1e293b] text-[#e2e8f0]';
         default: return 'bg-[#faf9f6] text-gray-900'; 
     }
  }, [readingSettings.paperTheme, theme, isCustomTheme]);

  const exportFavoritesToMarkdown = () => {
    let content = `# ${t.favoritesTitle}\n\n${t.generatedBy}\n\n---\n\n`;
    filteredFavorites.forEach(({ block, projectMeta }) => {
        content += `### ${projectMeta.title} (${projectMeta.fandom})\n`;
        content += `> ${block.original}\n\n`;
        content += `${block.translated}\n\n`;
        if (block.note) content += `*Note: ${block.note}*\n\n`;
        content += `---\n\n`;
    });
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `favorites_clippings_${new Date().toISOString().slice(0,10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed inset-0 top-16 z-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-8 transition-colors ${paperThemeClasses}`}>
      
      {/* Background Logic for Overlay */}
      {isCustomTheme && readingSettings.customBgImage && (
            <div 
              className="fixed inset-0 z-0 pointer-events-none"
              style={{ 
                  backgroundImage: `url(${readingSettings.customBgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }}
            ></div>
       )}
       {isCustomTheme && (
            <div 
              className="fixed inset-0 z-[1] pointer-events-none transition-all duration-300"
              style={{ 
                  backgroundColor: theme === 'dark' ? `rgba(0,0,0,${readingSettings.overlayOpacity ?? 0.9})` : `rgba(255,255,255,${readingSettings.overlayOpacity ?? 0.9})`,
                  backdropFilter: `blur(${readingSettings.overlayBlur ?? 0}px)`,
                  WebkitBackdropFilter: `blur(${readingSettings.overlayBlur ?? 0}px)`,
              }}
            ></div>
       )}

      <div className="relative z-10">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-red-50/80 to-white/80 dark:from-[#2a1a1a]/80 dark:to-[#1a1a1a]/80 backdrop-blur-md rounded-3xl p-8 mb-8 border border-red-100/50 dark:border-red-900/30 overflow-hidden shadow-sm max-w-7xl mx-auto">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Heart className="w-64 h-64 text-[#990000]" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
             <h1 className="text-4xl font-serif font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tight">
                <span className="bg-[#990000] text-white p-3 rounded-2xl shadow-lg shadow-red-900/20">
                    <Heart className="w-8 h-8 fill-current" />
                </span>
                {t.favoritesTitle}
             </h1>
             <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg font-medium ml-1" 
                dangerouslySetInnerHTML={{ __html: t.collectedSnippet.replace('{{count}}', allFavorites.length.toString()) }}
             />
          </div>

          <div className="flex flex-wrap gap-3">
              <Tooltip content={t.backupDescription}>
                <button 
                    onClick={onExportBackup}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-sm transition-colors"
                >
                    <Archive className="w-4 h-4" /> {t.exportFavorites}
                </button>
              </Tooltip>
              
              <Tooltip content={t.exportText}>
                <button 
                    onClick={exportFavoritesToMarkdown}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-sm transition-colors"
                >
                    <FileDown className="w-4 h-4" /> {t.exportFavoritesMD}
                </button>
              </Tooltip>

              <button 
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 font-bold text-sm transition-all shadow-lg"
              >
                  <X className="w-4 h-4" /> {t.close}
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
             {/* Search */}
             <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                 <input 
                     type="text" 
                     placeholder={t.searchQuotes} 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#990000]/20 outline-none text-sm transition-all"
                 />
             </div>
             
             {/* Filter */}
             <div className="relative min-w-[200px]">
                 <Filter className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-500 z-10" />
                 <select 
                     value={filterFandom} 
                     onChange={(e) => setFilterFandom(e.target.value)}
                     className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                 >
                     <option value="ALL">{t.filterFandom}</option>
                     {fandoms.map(f => <option key={f} value={f}>{f.length > 30 ? f.slice(0, 30) + '...' : f}</option>)}
                 </select>
             </div>
        </div>

        {filteredFavorites.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-32 bg-white/50 dark:bg-[#1e1e1e]/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center space-y-6">
               <div className="bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-full">
                   <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600" />
               </div>
               <div className="max-w-md space-y-2">
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.noFavorites}</h3>
                   <p className="text-gray-500 dark:text-gray-400 text-sm">{t.favoritesGuide}</p>
               </div>
           </div>
        ) : (
           <div className="grid grid-cols-1 gap-8 pb-20">
              {filteredFavorites.map(({ block, projectMeta, projectId }) => (
                 <div key={`${projectId}-${block.id}`} className="group bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 border border-gray-200 dark:border-gray-800 transition-all duration-300">
                    {/* Card Header */}
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center rounded-t-2xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-1 h-8 bg-[#990000] rounded-full shrink-0"></div>
                            <div className="flex flex-col min-w-0">
                               <span className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm md:text-base">{projectMeta.title}</span> 
                               <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="truncate">{projectMeta.author}</span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold truncate max-w-[150px]">{projectMeta.fandom}</span>
                               </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip content={t.goToSource}>
                                <button 
                                  onClick={() => onNavigateToProject(projectId, block.id)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </Tooltip>
                            <Tooltip content={t.deleteFavorite}>
                                <button 
                                  onClick={() => onRemoveFavorite(projectId, block.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {/* Content Grid */}
                        <div className="grid md:grid-cols-2 gap-8 mb-6 relative">
                            {/* Quote Icon Background */}
                            <Quote className="absolute -top-4 -left-2 w-16 h-16 text-gray-100 dark:text-gray-800 fill-current -z-0" />
                            
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t.originalLabel}</h4>
                                <div className="font-serif text-gray-600 dark:text-gray-300 text-justify leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-4 text-base">
                                    {block.original}
                                </div>
                            </div>
                            
                            <div className="relative z-10">
                                 <h4 className="text-[10px] font-black text-[#990000] dark:text-red-400 uppercase tracking-widest mb-3">{t.translationLabel}</h4>
                                 <div className="font-serif text-gray-900 dark:text-gray-100 text-justify text-lg leading-relaxed">
                                     <ReactMarkdown components={{ p: ({node, ...props}) => <p {...props} className="mb-0" /> }}>
                                      {block.translated}
                                     </ReactMarkdown>
                                 </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100/50 dark:border-amber-900/30 transition-colors">
                            <div className="flex items-start gap-3">
                                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-1 shrink-0" />
                                <div className="flex-1 space-y-1">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">{t.translatorNoteLabel}</span>
                                    <textarea 
                                        value={block.note || ''}
                                        onChange={(e) => onUpdateNote(projectId, block.id, e.target.value)}
                                        placeholder={t.notePlaceholder}
                                        className="w-full bg-transparent border-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-0 resize-none leading-relaxed p-0"
                                        rows={block.note ? Math.max(1, block.note.split('\n').length) : 1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
