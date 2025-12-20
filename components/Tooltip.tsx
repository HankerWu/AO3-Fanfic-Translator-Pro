
import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Position logic
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div 
            className={`absolute z-50 px-2 py-1 text-[10px] font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${positionClasses[position]}`}
            role="tooltip"
        >
          {content}
          {/* Simple CSS arrow - matching opacity to avoid seams */}
          <div className={`absolute w-1.5 h-1.5 rotate-45 bg-gray-900 dark:bg-white 
            ${position === 'top' ? 'bottom-[-3px] left-1/2 -translate-x-1/2' : ''}
            ${position === 'bottom' ? 'top-[-3px] left-1/2 -translate-x-1/2' : ''}
            ${position === 'left' ? 'right-[-3px] top-1/2 -translate-y-1/2' : ''}
            ${position === 'right' ? 'left-[-3px] top-1/2 -translate-y-1/2' : ''}
          `}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
