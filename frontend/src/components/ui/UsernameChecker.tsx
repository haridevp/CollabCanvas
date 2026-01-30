import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
// Corrected imports to use your existing files
import { checkUsernameAvailability } from '../../utils/authService';

// Utility debounce if you don't have a separate file, 
// otherwise keep your import from ../../utils/debounce
const debounceFunc = (fn: Function, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export interface UsernameCheckerProps {
  username: string;
  onAvailabilityChange?: (available: boolean) => void;
  className?: string;
  debounceTime?: number;
}

export const UsernameChecker: React.FC<UsernameCheckerProps> = ({
  username,
  onAvailabilityChange,
  className = '',
  debounceTime = 500
}) => {
  const [checkResult, setCheckResult] = useState<{available: boolean, message: string, suggestions?: string[]} | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedCheck = useMemo(() => 
    debounceFunc(async (usernameToCheck: string) => {
      const trimmed = usernameToCheck.trim();
      if (!trimmed || trimmed.length < 3) {
        setCheckResult(null);
        setIsChecking(false);
        onAvailabilityChange?.(false);
        return;
      }

      try {
        setIsChecking(true);
        setError(null);
        const result = await checkUsernameAvailability(trimmed);
        setCheckResult(result);
        onAvailabilityChange?.(result.available);
      } catch (err) {
        setError('Unable to check username availability');
        setCheckResult(null);
        onAvailabilityChange?.(false);
      } finally {
        setIsChecking(false);
      }
    }, debounceTime),
    [debounceTime, onAvailabilityChange]
  );

  useEffect(() => {
    if (username.trim().length >= 3) {
      setIsChecking(true);
      debouncedCheck(username);
    } else {
      setCheckResult(null);
      setIsChecking(false);
    }
  }, [username, debouncedCheck]);

  if (!username.trim() || username.trim().length < 1) return null;

  return (
    <div className={`mt-2 space-y-2 ${className}`} role="status">
      <div className="flex items-center gap-2">
        {isChecking ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : checkResult?.available ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <X className="w-4 h-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {isChecking ? 'Checking...' : error ? <span className="text-red-600">{error}</span> : 
           <span className={checkResult?.available ? 'text-green-600' : 'text-red-600'}>
             {checkResult?.message || (username.length < 3 ? 'Minimum 3 characters' : '')}
           </span>}
        </span>
      </div>

      {!isChecking && checkResult && !checkResult.available && checkResult.suggestions && (
        <div className="mt-2">
          <p className="text-xs text-slate-600 mb-1">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {checkResult.suggestions.map((s) => (
              <span key={s} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsernameChecker;