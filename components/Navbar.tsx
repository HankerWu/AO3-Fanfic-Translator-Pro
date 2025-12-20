
import React, { useState } from 'react';
import { Languages, Heart, Library, Sun, Moon, Settings, Archive, Menu, X, BookOpen } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[60] bg-white/95 dark:bg-[#1a1a1a]/95 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer group flex-shrink-0" onClick={onHome}>
          <div className="bg-[#990000] dark:bg-[#b30000] text-white p-1.5 px-2 rounded font-serif font-bold text-lg tracking-tighter shadow-sm group-hover:shadow-md transition-all">AO3</div>
          <div className="flex flex-col">
            {/* Desktop Title */}
            <span className="hidden md:inline font-serif font-bold text-gray-900 dark:text-gray-100 text-base md:text-lg leading-none tracking-tight">
                {t.appTitle}
            </span>
            {/* Mobile Title (Short) */}
            <span className="md:hidden font-serif font-bold text-gray-900 dark:text-gray-100 text-base leading-none tracking-tight">
                {t.appTitleShort}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium hidden sm:block">{t.poweredBy}</span>
          </div>
        </div>

        {/* Center: Reading Controls (Desktop) */}
        <div className="flex-1 flex justify-center px-2">
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
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 justify-end">
          {/* Desktop Language Selector */}
          <div className="hidden md:flex items-center gap-1 text-gray-500 dark:text-gray-400">
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
          
          {/* Grouped Library Actions (Always Visible) */}
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
                    className={`p-1.5 rounded-full transition-colors ${showHistory ? 'bg-white dark:bg-gray-700 shadow text-[#990000]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    <Library className="w-4 h-4" />
                </button>
              </Tooltip>
          </div>

          {/* Secondary Actions (Desktop Only) */}
          <div className="hidden md:flex items-center gap-2">
            <Tooltip content={t.exportHistory} position="bottom">
                <button 
                    onClick={onSaveData} 
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
                >
                    <Archive className="w-5 h-5" />
                    {hasHistory && <span className="absolute top-2 right-2 w-2 h-2 bg-[#990000] border-2 border-white dark:border-[#1a1a1a] rounded-full animate-pulse"></span>}
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

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] shadow-lg animate-in slide-in-from-top-2 fade-in duration-200 overflow-y-auto max-h-[80vh]">
            <div className="p-4 space-y-4">
                {/* Language Selector (Mobile) */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <Languages className="w-4 h-4" /> {t.changeLanguage}
                    </div>
                    <select 
                        value={uiLang} 
                        onChange={(e) => setUiLang(e.target.value as LanguageCode)}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm outline-none"
                    >
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                    </select>
                </div>

                {/* View Mode (Mobile) - Only if project active */}
                {currentProject && !showFavorites && !showHistory && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 px-1">
                            <BookOpen className="w-4 h-4" /> {t.viewMode}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: DisplayMode.TRANSLATED_ONLY, label: t.displayTranslated },
                                { id: DisplayMode.SIDE_BY_SIDE, label: t.displaySideBySide },
                                { id: DisplayMode.INTERLINEAR, label: t.displayInterlinear }
                            ].map(mode => (
                                <button 
                                    key={mode.id}
                                    onClick={() => { setDisplayMode(mode.id); setIsMobileMenuOpen(false); }}
                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${displayMode === mode.id ? 'bg-[#990000] text-white shadow-md' : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-2">
                    <button 
                        onClick={() => { onSaveData(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                    >
                        <div className="relative">
                            <Archive className="w-5 h-5 text-gray-500" />
                            {hasHistory && <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#990000] border-2 border-white dark:border-[#1a1a1a] rounded-full"></span>}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{t.exportHistory}</span>
                    </button>

                    <button 
                        onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5 text-gray-500" /> : <Sun className="w-5 h-5 text-gray-500" />}
                        <span className="text-gray-700 dark:text-gray-300">{theme === 'light' ? t.toggleThemeDark : t.toggleThemeLight}</span>
                    </button>

                    <button 
                        onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                    >
                        <Settings className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t.settings}</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
