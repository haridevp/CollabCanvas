import React from 'react';

/**
 * Interface defining the properties for the Button component
 * Extends native button attributes for full HTML button compatibility
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Loading state - shows spinner and disables button */
  isLoading?: boolean;
}

/**
 * Button component - Reusable button with multiple variants and loading state
 * Provides consistent styling and behavior across the application
 */
export const Button = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className, 
  ...props 
}: ButtonProps) => {
  /**
   * Base button styles - applied to all button variants
   * Includes padding, rounding, transitions, and disabled state styling
   */
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  
  /**
   * Variant-specific styles - defines visual appearance for each variant
   */
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:bg-blue-800",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 shadow-sm hover:shadow-md active:bg-slate-950",
    outline: "border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className || ''}`} 
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      aria-disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        // Loading spinner - only shown when isLoading is true
        <div 
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" 
          aria-label="Loading"
          role="status"
        />
      ) : (
        // Button content - shown when not loading
        children
      )}
    </button>
  );
};