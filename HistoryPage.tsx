
import React, { useState, useMemo } from 'react';
import { TranslationProject } from '../types';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { 
  BookOpen, Clock, Search, Filter, Trash2, Upload, 
  ArrowRight, Archive, CheckCircle2, Circle, X, PlayCircle
} from 'lucide-react';

interface HistoryPageProps {
  history: TranslationProject[];
  lang: LanguageCode;
  onNavigateToProject: (project: TranslationProject) => void;
  onTriggerUpdate: (projectId: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClose: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  lang,
  onNavigateToProject,
  onTriggerUpdate,
  onDelete,
  onClear,
  onImport,
  onExport,
  onClose
}) => {
  const t = UI_STRINGS[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFandom, setFilterFandom] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'COMPLETED', 'IN_PROGRESS'
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Derived Data
  const fandoms = useMemo(() => {
    const fs = new Set(history.map(p => p.metadata.fandom || 'Unknown'));
    return Array.from(fs).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(p => {
      // Search
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        (p.metadata.title?.toLowerCase().includes(query) || '') ||
        (p.metadata.author?.toLowerCase().includes(query) || '');
      
      // Fandom
      const matchesFandom = filterFandom === 'ALL' || p.metadata.fandom === filterFandom;

      // Status
      const total = p.blocks.length;
      const done = p.blocks.filter(b => b.translated).length;
      const isComplete = total > 0 && total === done;
      let matchesStatus = true;
      if (filterStatus === 'COMPLETED') matchesStatus = isComplete;
      if (filterStatus === 'IN_PROGRESS') matchesStatus = !isComplete;

      return matchesSearch && matchesFandom && matchesStatus;
    }).sort((a, b) => b.lastModified - a.lastModified);
  }, [history, searchTerm, filterFandom, filterStatus]);

  return (
    <div className="fixed inset-0 z-50 bg-[#faf9f6] dark:bg-[#121212] overflow-y-auto animate-in slide-in-from-right-4 duration-300">
       {/* Hidden inputs for file ops */}
       <input type="file" ref={fileInputRef} onChange={onImport} accept=".json" className="hidden" />

       {/* Header */}
       <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#1a1a1a]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
               <div className="bg-[#990000] p-2 rounded-lg text-white">
                   <BookOpen className="w-6 h-6" />
               </div>
               <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">{t.libraryTitle}</h1>
               <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-bold">
                   {history.length}
               </span>
           </div>
           <div className="flex gap-3">
               <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors text-sm" title="Export full backup">
                   <Archive className="w-4 h-4" /> {t.exportHistory}
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors text-sm" title="Import backup">
                   <Upload className="w-4 h-4" /> {t.importHistory}
               </button>
               <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors" title="Close Library">
                   <X className="w-6 h-6" />
               </button>
           </div>
       </div>

       {/* Toolbar */}
       <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
           <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
               {/* Search */}
               <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                   <input 
                       type="text" 
                       placeholder={t.searchLibrary} 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#990000]/20 outline-none text-sm transition-all"
                   />
               </div>
               
               {/* Filters */}
               <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                   <div className="relative min-w-[150px]">
                       <Filter className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-500 z-10" />
                       <select 
                           value={filterFandom} 
                           onChange={(e) => setFilterFandom(e.target.value)}
                           className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                       >
                           <option value="ALL">{t.filterFandom}</option>
                           {fandoms.map(f => <option key={f} value={f}>{f.length > 20 ? f.slice(0, 20) + '...' : f}</option>)}
                       </select>
                   </div>

                   <select 
                       value={filterStatus} 
                       onChange={(e) => setFilterStatus(e.target.value)}
                       className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                   >
                       <option value="ALL">{t.filterStatus}</option>
                       <option value="IN_PROGRESS">{t.statusInProgress}</option>
                       <option value="COMPLETED">{t.statusCompleted}</option>
                   </select>

                   {history.length > 0 && (
                        <button onClick={onClear} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg font-medium transition-colors whitespace-nowrap">
                            {t.clearHistory}
                        </button>
                   )}
               </div>
           </div>

           {/* Grid */}
           {filteredHistory.length === 0 ? (
               <div className="text-center py-20 text-gray-400">
                   <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                   <p className="text-lg font-medium">{t.noHistory}</p>
               </div>
           ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredHistory.map(project => {
                       const total = project.blocks.length;
                       const done = project.blocks.filter(b => b.translated).length;
                       const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                       const isComplete = percent === 100;
                       
                       return (
                           <div key={project.id} className="group bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg hover:border-[#990000]/30 transition-all duration-300 flex flex-col h-full">
                               {/* Card Header */}
                               <div className="flex justify-between items-start mb-3">
                                   <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                                       {project.metadata.targetLanguage}
                                   </span>
                                   {isComplete ? (
                                       <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                           <CheckCircle2 className="w-3 h-3" /> {t.statusCompleted}
                                       </span>
                                   ) : (
                                       <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                                           <Circle className="w-3 h-3" /> {percent}%
                                       </span>
                                   )}
                               </div>

                               {/* Metadata */}
                               <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-gray-100 line-clamp-2 mb-1 group-hover:text-[#990000] dark:group-hover:text-red-400 transition-colors cursor-pointer" onClick={() => onNavigateToProject(project)}>
                                   {project.metadata.title}
                               </h3>
                               <p className="text-sm text-gray-500 mb-4 line-clamp-1">{project.metadata.author}</p>
                               <div className="text-xs text-gray-400 font-mono mb-4 bg-gray-50 dark:bg-gray-900 p-2 rounded truncate">
                                   {project.metadata.fandom}
                                </div>

                               {/* Progress Bar */}
                               <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-6">
                                   <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#990000]'}`} style={{ width: `${percent}%` }}></div>
                               </div>
                               
                               <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(project.lastModified).toLocaleDateString()}
                                    </span>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onTriggerUpdate(project.id); }}
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            title={t.updateSourceDesc}
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(confirm("Delete this project?")) onDelete(project.id); }}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title={t.deleteProject}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onNavigateToProject(project)}
                                            className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${!isComplete ? 'bg-green-600 text-white hover:bg-green-700 shadow-md' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80'}`}
                                            title={!isComplete ? t.resume : "Read"}
                                        >
                                            {!isComplete && <PlayCircle className="w-3.5 h-3.5" />}
                                            {!isComplete ? t.resume : <ArrowRight className="w-4 h-4" />}
                                        </button>
                                    </div>
                               </div>
                           </div>
                       )
                   })}
               </div>
           )}
       </div>
    </div>
  );
};

export default HistoryPage;
