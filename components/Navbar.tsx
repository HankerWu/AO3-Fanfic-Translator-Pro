
import React from 'react';
import { Languages, Heart, Library, Sun, Moon, Settings, Archive } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { UI_STRINGS, LanguageCode } from '../services/i18n';
import { DisplayMode } from '../types';
import Tooltip from './Tooltip';

interface NavbarProps {
  uiLang: LanguageCode;
  setUiLang: (lang: LanguageCode) => void;
  showFavorites: boolean;
  setShowFavorites: () => void;
  showHistory: boolean;
  toggleHistory: () => void;
  hasHistory: boolean;
  currentProject: any;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  onHome: () => void;
  onOpenSettings: () => void;
  onSaveData: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  uiLang, setUiLang, showFavorites, setShowFavorites, showHistory, toggleHistory,
  hasHistory, currentProject, displayMode, setDisplayMode, onHome, onOpenSettings, onSaveData
}) => {
  const t = UI_STRINGS[uiLang];
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-[60] bg-white/95 dark:bg-[#1a1a1a]/95 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3 cursor-pointer group flex-shrink-0 w-[200px]" onClick={onHome}>
          <div className="bg-[#990000] dark:bg-[#b30000] text-white p-1.5 px-2 rounded font-serif font-bold text-lg tracking-tighter shadow-sm group-hover:shadow-md transition-all">AO3</div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-gray-900 dark:text-gray-100 text-lg leading-none tracking-tight">{t.appTitle}</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{t.poweredBy}</span>
          </div>
        </div>

        {/* Center: Reading Controls (Only Visible when reading) */}
        <div className="flex-1 flex justify-center">
            {currentProject && !showFavorites && !showHistory && (
                <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
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
        </div>

        {/* Right: Global Actions */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 w-[240px] justify-end">
          <div className="hidden sm:flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Languages className="w-4 h-4" />
            <select 
              value={uiLang} 
              onChange={(e) => setUiLang(e.target.value as LanguageCode)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer hover:text-[#990000] transition-colors"
            >
              <option value="en" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">English</option>
              <option value="zh" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">中文</option>
              <option value="ja" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">日本語</option>
            </select>
          </div>
          
          {/* Grouped Library Actions */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 border border-gray-200 dark:border-gray-700">
              <Tooltip content={t.favorites} position="bottom">
                <button 
                    onClick={setShowFavorites} 
                    className={`p-1.5 rounded-full transition-colors ${showFavorites ? 'bg-white dark:bg-gray-700 shadow text-[#990000]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    <Heart className={`w-4 h-4 ${showFavorites ? 'fill-current' : ''}`} />
                </button>
              </Tooltip>

              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

              <Tooltip content={t.history} position="bottom">
                <button 
                    onClick={toggleHistory} 
                    className={`p-1.5 rounded-full transition-colors relative ${showHistory ? 'bg-white dark:bg-gray-700 shadow text-[#990000]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    <Library className="w-4 h-4" />
                    {hasHistory && !showHistory && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#990000] border border-gray-100 dark:border-gray-800 rounded-full"></span>}
                </button>
              </Tooltip>
          </div>

          <Tooltip content={t.exportHistory} position="bottom">
            <button 
                onClick={onSaveData} 
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
                <Archive className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip content={theme === 'light' ? t.toggleThemeDark : t.toggleThemeLight} position="bottom">
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </Tooltip>

          <Tooltip content={t.settings} position="bottom">
            <button onClick={onOpenSettings} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
