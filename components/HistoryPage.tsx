
import React, { useState, useMemo } from 'react';
import { TranslationProject } from '../types';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { 
  BookOpen, Clock, Search, Filter, Trash2, Upload, 
  ArrowRight, Archive, CheckCircle2, Circle, X, PlayCircle, Plus, FileUp, AlertTriangle
} from 'lucide-react';
import Tooltip from './Tooltip';

interface HistoryPageProps {
  history: TranslationProject[];
  lang: LanguageCode;
  onNavigateToProject: (project: TranslationProject) => void;
  onCreateNew: () => void;
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
  onCreateNew,
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

  // State for Custom Delete Modal
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Derived Data: Split comma-separated fandoms
  const fandoms = useMemo(() => {
    const fs = new Set<string>();
    history.forEach(p => {
        const rawFandom = p.metadata.fandom || 'Unknown';
        rawFandom.split(',').forEach(f => fs.add(f.trim()));
    });
    return Array.from(fs).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(p => {
      // Search
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        (p.metadata.title?.toLowerCase().includes(query) || '') ||
        (p.metadata.author?.toLowerCase().includes(query) || '');
      
      // Fandom (Check if the project's fandom string INCLUDES the selected filter)
      const matchesFandom = filterFandom === 'ALL' || (p.metadata.fandom && p.metadata.fandom.includes(filterFandom));

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

  const requestDelete = (e: React.MouseEvent, projectId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setProjectToDelete(projectId);
  };

  const confirmDelete = () => {
      if (projectToDelete) {
          onDelete(projectToDelete);
          setProjectToDelete(null);
      }
  };

  return (
    <div className="fixed inset-0 top-16 z-50 bg-[#faf9f6] dark:bg-[#121212] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-8">
       {/* Hidden inputs for file ops */}
       <input type="file" ref={fileInputRef} onChange={onImport} accept=".json" className="hidden" />

       {/* Header Section (Unified Style with FavoritesPage - Rounded Gradient Card) */}
       <div className="relative bg-gradient-to-r from-gray-100 to-white dark:from-[#252525] dark:to-[#1a1a1a] rounded-3xl p-8 mb-8 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm max-w-7xl mx-auto">
            {/* Background Icon Decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <BookOpen className="w-64 h-64 text-gray-900 dark:text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-serif font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tight">
                        <span className="bg-[#990000] text-white p-3 rounded-2xl shadow-lg shadow-red-900/20">
                            <BookOpen className="w-8 h-8" />
                        </span>
                        {t.libraryTitle}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg font-medium ml-1">
                        {history.length} Projects
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Tooltip content={t.newTranslation}>
                        <button onClick={onCreateNew} className="flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white rounded-xl hover:bg-[#800000] font-bold text-sm transition-colors shadow-lg shadow-red-900/20">
                            <Plus className="w-4 h-4" /> {t.new}
                        </button>
                    </Tooltip>

                    <Tooltip content={t.exportHistory}>
                        <button onClick={onExport} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-sm transition-colors">
                            <Archive className="w-4 h-4" /> {t.exportHistory}
                        </button>
                    </Tooltip>

                    <Tooltip content={t.importHistory}>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-sm transition-colors">
                            <Upload className="w-4 h-4" /> {t.importHistory}
                        </button>
                    </Tooltip>

                    <Tooltip content={t.close}>
                        <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 font-bold text-sm transition-all shadow-lg">
                            <X className="w-4 h-4" /> {t.close}
                        </button>
                    </Tooltip>
                </div>
            </div>
       </div>

       {/* Toolbar */}
       <div className="max-w-7xl mx-auto space-y-6">
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
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
               {filteredHistory.map(project => {
                   const total = project.blocks.length;
                   const done = project.blocks.filter(b => b.translated).length;
                   const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                   const isComplete = percent === 100;
                   
                   return (
                       <div key={project.id} className="group bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg hover:border-[#990000]/30 transition-all duration-300 flex flex-col h-full min-h-[250px]">
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
                           <div className="text-xs text-gray-400 font-mono mb-4 bg-gray-50 dark:bg-gray-900 p-2 rounded truncate" title={project.metadata.fandom}>
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
                                    <Tooltip content={t.updateSourceDesc}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onTriggerUpdate(project.id); }}
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            <FileUp className="w-4 h-4" />
                                        </button>
                                    </Tooltip>

                                    <Tooltip content={t.deleteProject}>
                                        <button 
                                            onClick={(e) => requestDelete(e, project.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                    
                                    <Tooltip content={!isComplete ? t.resume : "Read Project"}>
                                        <button 
                                            onClick={() => onNavigateToProject(project)}
                                            className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${!isComplete ? 'bg-green-600 text-white hover:bg-green-700 shadow-md' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80'}`}
                                        >
                                            {!isComplete && <PlayCircle className="w-3.5 h-3.5" />}
                                            {!isComplete ? t.resume : <ArrowRight className="w-4 h-4" />}
                                        </button>
                                    </Tooltip>
                                </div>
                           </div>
                       </div>
                   )
               })}

               {/* Dashed 'Create New' Card - Last in list */}
               <div 
                  onClick={onCreateNew}
                  className="group bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 hover:border-[#990000] dark:hover:border-red-500 hover:bg-white dark:hover:bg-[#1a1a1a] transition-all duration-300 flex flex-col items-center justify-center min-h-[250px] cursor-pointer"
               >
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform mb-4">
                      <Plus className="w-8 h-8 text-gray-400 group-hover:text-[#990000] dark:group-hover:text-red-400 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-600 dark:text-gray-300 text-lg">{t.new}</h3>
                  <p className="text-sm text-gray-400 text-center mt-2 max-w-[200px]">Start a new translation from file, text, or URL</p>
               </div>
           </div>
       </div>

       {/* Custom Delete Confirmation Modal */}
       {projectToDelete && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                 <div className="flex flex-col items-center text-center space-y-4">
                     <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500">
                         <AlertTriangle className="w-6 h-6" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.deleteProject}?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t.confirmDelete || "This action cannot be undone. Are you sure you want to permanently delete this project?"}
                        </p>
                     </div>
                     <div className="flex gap-3 w-full pt-2">
                         <button 
                             onClick={() => setProjectToDelete(null)}
                             className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                         >
                             {t.updateCancel || "Cancel"}
                         </button>
                         <button 
                             onClick={confirmDelete}
                             className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                         >
                             Delete
                         </button>
                     </div>
                 </div>
             </div>
         </div>
       )}
    </div>
  );
};

export default HistoryPage;
