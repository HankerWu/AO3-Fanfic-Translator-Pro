
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to finish before unmounting
      setTimeout(() => onClose(id), 300); 
    }, 5000); 
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
  };

  const styles = {
    success: 'border-l-4 border-green-500 bg-white/95 dark:bg-[#1e1e1e]/95 text-gray-800 dark:text-gray-100',
    error: 'border-l-4 border-red-500 bg-white/95 dark:bg-[#1e1e1e]/95 text-gray-800 dark:text-gray-100',
    info: 'border-l-4 border-blue-500 bg-white/95 dark:bg-[#1e1e1e]/95 text-gray-800 dark:text-gray-100',
  };

  const Icon = () => {
      switch(type) {
          case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
          case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
          default: return <Info className="w-5 h-5 text-blue-500" />;
      }
  };

  return (
    <div 
        className={`
            flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[320px] max-w-md 
            transition-all duration-300 ease-in-out transform border border-white/20 dark:border-white/5
            ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            ${styles[type]}
        `}
    >
      <div className="mt-0.5 shrink-0"><Icon /></div>
      <div className="flex-1 text-sm font-medium leading-relaxed font-sans">{message}</div>
      <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
