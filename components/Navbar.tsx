
import React from 'react';
import { Globe, Heart, History, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { DisplayMode } from '../types';

interface NavbarProps {
  uiLang: LanguageCode;
  setUiLang: (lang: LanguageCode) => void;
  showFavorites: boolean;
  setShowFavorites: (val: boolean) => void;
  setHistoryOpen: (val: boolean) => void;
  hasHistory: boolean;
  currentProject: any;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  onHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  uiLang, setUiLang, showFavorites, setShowFavorites, setHistoryOpen, 
  hasHistory, currentProject, displayMode, setDisplayMode, onHome
}) => {
  const t = UI_STRINGS[uiLang];
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#1a1a1a]/95 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onHome}>
          <div className="bg-[#990000] dark:bg-[#b30000] text-white p-1.5 px-2 rounded font-serif font-bold text-lg tracking-tighter shadow-sm">AO3</div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-gray-900 dark:text-gray-100 text-lg leading-none tracking-tight">{t.appTitle}</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{t.poweredBy}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Globe className="w-4 h-4" />
            <select 
              value={uiLang} 
              onChange={(e) => setUiLang(e.target.value as LanguageCode)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer hover:text-[#990000] transition-colors"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setShowFavorites(!showFavorites)} 
            className={`p-2 rounded-full transition-colors ${showFavorites ? 'text-[#990000] bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <Heart className={`w-5 h-5 ${showFavorites ? 'fill-current' : ''}`} />
          </button>

          {currentProject && !showFavorites && (
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
              {[
                { id: DisplayMode.TRANSLATED_ONLY, label: t.displayTranslated },
                { id: DisplayMode.SIDE_BY_SIDE, label: t.displaySideBySide },
                { id: DisplayMode.INTERLINEAR, label: t.displayInterlinear }
              ].map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setDisplayMode(mode.id)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${displayMode === mode.id ? 'bg-white dark:bg-gray-700 shadow text-[#990000] dark:text-red-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setHistoryOpen(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full relative transition-colors">
            <History className="w-5 h-5" />
            {hasHistory && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#990000] border border-white dark:border-[#1a1a1a] rounded-full"></span>}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
