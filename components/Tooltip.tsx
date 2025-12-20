
import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  shift?: number; // New: Manual horizontal shift percentage to fix alignment bugs
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '', shift = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Position logic
  // We use inline styles for the transform to support the dynamic 'shift' prop
  const getPositionStyles = () => {
      let baseTransform = '';
      let classes = '';

      switch (position) {
          case 'top':
              classes = 'bottom-full left-1/2 mb-2';
              baseTransform = `translate(calc(-50% + ${shift}px), 0)`;
              break;
          case 'bottom':
              classes = 'top-full left-1/2 mt-2';
              baseTransform = `translate(calc(-50% + ${shift}px), 0)`;
              break;
          case 'left':
              classes = 'right-full top-1/2 mr-2';
              baseTransform = `translate(0, -50%)`;
              break;
          case 'right':
              classes = 'left-full top-1/2 ml-2';
              baseTransform = `translate(0, -50%)`;
              break;
      }
      return { classes, style: { transform: baseTransform } };
  };

  const { classes, style } = getPositionStyles();

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
            className={`absolute z-50 px-2 py-1 text-[10px] font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${classes}`}
            style={style}
            role="tooltip"
        >
          {content}
          {/* Simple CSS arrow - matching opacity to avoid seams */}
          <div 
            className={`absolute w-1.5 h-1.5 rotate-45 bg-gray-900 dark:bg-white 
            ${position === 'top' ? 'bottom-[-3px] left-1/2' : ''}
            ${position === 'bottom' ? 'top-[-3px] left-1/2' : ''}
            ${position === 'left' ? 'right-[-3px] top-1/2' : ''}
            ${position === 'right' ? 'left-[-3px] top-1/2' : ''}
            `}
            style={{ 
                transform: (position === 'top' || position === 'bottom') ? `translate(calc(-50% - ${shift}px), 0) rotate(45deg)` : 'translate(0, -50%) rotate(45deg)' 
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
