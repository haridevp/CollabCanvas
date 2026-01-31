// src/components/ui/CharacterCounter.tsx
import React from 'react';

interface CharacterCounterProps {
  currentLength: number;
  maxLength: number;
  warningThreshold?: number; // Percentage when to show warning (default: 80%)
  className?: string;
  showMessage?: boolean;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({
  currentLength,
  maxLength,
  warningThreshold = 80,
  className = '',
  showMessage = true
}) => {
  const percentage = (currentLength / maxLength) * 100;
  const remaining = maxLength - currentLength;
  
  // Determine color based on usage
  let colorClass = 'text-slate-500 dark:text-slate-400';
  let status = 'normal';
  
  if (percentage >= warningThreshold && percentage < 100) {
    colorClass = 'text-yellow-600 dark:text-yellow-500';
    status = 'warning';
  } else if (currentLength > maxLength) {
    colorClass = 'text-red-600 dark:text-red-500';
    status = 'danger';
  }

  // Generate status message
  const getMessage = () => {
    if (remaining >= 0) {
      return `${remaining} characters remaining`;
    } else {
      return `Exceeds limit by ${Math.abs(remaining)} characters`;
    }
  };

  return (
    <div className={`text-sm ${colorClass} ${className}`}>
      {showMessage && (
        <div className="flex items-center justify-between">
          <span>{getMessage()}</span>
          <span className="font-medium">
            {currentLength}/{maxLength}
          </span>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            status === 'normal' ? 'bg-blue-600' :
            status === 'warning' ? 'bg-yellow-500' :
            'bg-red-600'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default CharacterCounter;