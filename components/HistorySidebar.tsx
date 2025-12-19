
import React, { useRef } from 'react';
import { TranslationProject } from '../types';
import { Clock, BookOpen, Trash2, X, Download, Upload, Trash, Archive } from 'lucide-react';
import { UI_STRINGS, LanguageCode } from '../services/i18n';

interface HistorySidebarProps {
  history: TranslationProject[];
  onSelect: (project: TranslationProject) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, onSelect, onDelete, onClear, onImport, onExport, isOpen, onClose, lang 
}) => {
  const t = UI_STRINGS[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-[#1a1a1a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#990000] dark:text-red-500" />
          {t.history}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Import/Export Actions */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <button 
            onClick={onExport}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Backup all projects, favorites, and notes"
          >
            <Archive className="w-3.5 h-3.5 text-[#990000] dark:text-red-400" /> {t.exportHistory}
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {t.importHistory}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onImport} 
            accept=".json" 
            className="hidden" 
          />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {history.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-600 text-center text-sm mt-10">{t.noHistory}</p>
        ) : (
          history.sort((a,b) => b.lastModified - a.lastModified).map((project) => {
            const total = project.blocks.length;
            const completed = project.blocks.filter(b => b.translated).length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isComplete = percent === 100;
            const favoritesCount = project.blocks.filter(b => b.isFavorite).length;

            return (
              <div 
                key={project.id} 
                className="group relative bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-red-300 dark:hover:border-red-900/50"
                onClick={() => onSelect(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 text-sm">{project.metadata.title || 'Untitled'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                       {project.metadata.fandom || 'Unknown Fandom'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                       <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-full uppercase border border-gray-200 dark:border-gray-700">
                         {project.metadata.targetLanguage}
                       </span>
                       {/* Progress Bar */}
                       <div className="flex items-center gap-2 flex-1 ml-3 max-w-[80px]">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} 
                                style={{ width: `${percent}%` }}
                             ></div>
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-center ml-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {favoritesCount > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
                              <Archive className="w-3 h-3" /> {favoritesCount}
                          </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {history.length > 0 && (
         <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
             <button 
                onClick={onClear} 
                className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
             >
                 <Trash className="w-4 h-4" /> {t.clearHistory}
             </button>
         </div>
      )}
    </div>
  );
};

export default HistorySidebar;
