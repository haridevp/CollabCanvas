import React from 'react';

export interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * PasswordStrengthMeter Component
 * A reusable component to visualize password strength
 * 
 * @component
 * @example
 * <PasswordStrengthMeter password={password} showLabel />
 */
export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showLabel = true,
  className = '',
}) => {
  /**
   * Calculates password strength based on multiple criteria
   * @param pass - Password string to evaluate
   * @returns Object containing strength score, label, color, and width
   */
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-200", width: "0%" };

    let score = 0;
    
    // Length check
    if (pass.length >= 8) score += 25;
    if (pass.length >= 12) score += 10;
    
    // Complexity checks
    if (/[A-Z]/.test(pass)) score += 15; // Has uppercase
    if (/[a-z]/.test(pass)) score += 15; // Has lowercase
    if (/[0-9]/.test(pass)) score += 15; // Has numbers
    if (/[^A-Za-z0-9]/.test(pass)) score += 20; // Has special characters
    
    // Deductions for common patterns
    if (/(.)\1{2,}/.test(pass)) score -= 10; // Repeated characters
    if (/(123|abc|password|qwerty)/i.test(pass)) score -= 15; // Common patterns
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
    if (score < 30) {
      return { 
        score, 
        label: "Weak", 
        color: "bg-red-500", 
        width: `${score}%` 
      };
    } else if (score < 70) {
      return { 
        score, 
        label: "Fair", 
        color: "bg-yellow-500", 
        width: `${score}%` 
      };
    } else if (score < 90) {
      return { 
        score, 
        label: "Good", 
        color: "bg-blue-500", 
        width: `${score}%` 
      };
    } else {
      return { 
        score, 
        label: "Strong", 
        color: "bg-green-500", 
        width: `${score}%` 
      };
    }
  };

  const strength = calculatePasswordStrength(password);

  return (
    <div className={`space-y-1 ${className}`} aria-live="polite" aria-atomic="true">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-slate-700">Password Strength</span>
          {password && (
            <span className={`text-xs font-semibold ${
              strength.label === "Weak" ? "text-red-600" :
              strength.label === "Fair" ? "text-yellow-600" :
              strength.label === "Good" ? "text-blue-600" :
              "text-green-600"
            }`}>
              {strength.label}
            </span>
          )}
        </div>
      )}
      
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${strength.color}`}
          style={{ width: strength.width }}
          role="progressbar"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${strength.label}`}
        />
      </div>
      
      {/* Password requirements checklist */}
      {password && (
        <ul className="text-xs text-slate-500 space-y-0.5 mt-2">
          <li className={`flex items-center ${password.length >= 8 ? "text-green-600" : ""}`}>
            <span className="mr-1">•</span> At least 8 characters
          </li>
          <li className={`flex items-center ${/[A-Z]/.test(password) ? "text-green-600" : ""}`}>
            <span className="mr-1">•</span> Contains uppercase letter
          </li>
          <li className={`flex items-center ${/[0-9]/.test(password) ? "text-green-600" : ""}`}>
            <span className="mr-1">•</span> Contains number
          </li>
          <li className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}`}>
            <span className="mr-1">•</span> Contains special character
          </li>
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;