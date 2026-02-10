/**
 * Utility Functions Module
 * 
 * Collection of utility functions for common programming patterns
 * and performance optimizations.
 * 
 * @module Utils
 */

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time
 * the debounced function was invoked.
 * 
 * Debouncing is particularly useful for:
 * - Search input fields (wait for user to stop typing)
 * - Window resize events (batch multiple resize events)
 * - Scroll events (improve performance by reducing event frequency)
 * - API calls (prevent rapid successive calls)
 * 
 * @function debounce
 * @template T - Type of the function to debounce
 * @param {T} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Parameters<T>) => void} A new debounced function
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const handleSearch = debounce((searchTerm: string) => {
 *   console.log('Searching for:', searchTerm);
 * }, 300);
 * 
 * // In an input event handler
 * searchInput.addEventListener('input', (e) => {
 *   handleSearch(e.target.value);
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // With TypeScript generics
 * const fetchData = debounce(async (url: string, params: object) => {
 *   const response = await fetch(url, params);
 *   return response.json();
 * }, 500);
 * 
 * fetchData('/api/users', { page: 1 });
 * ```
 * 
 * @remarks
 * The debounced function will only invoke the original function after
 * `wait` milliseconds have elapsed since the last time it was called.
 * If called again within the wait period, the timer is reset.
 * 
 * @see {@link https://davidwalsh.name/javascript-debounce-function} for more about debouncing
 * 
 * @performance
 * This implementation uses `setTimeout` and `clearTimeout` for efficient
 * debouncing. It properly clears previous timeouts to prevent memory leaks
 * and ensures only the most recent call is executed.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  /**
   * The debounced function that will be returned
   * @param args - Arguments to pass to the original function
   */
  return function executedFunction(...args: Parameters<T>) {
    /**
     * Function to execute after the wait period
     * Clears the timeout and invokes the original function
     */
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    // Clear any existing timeout to reset the wait period
    clearTimeout(timeout);
    
    // Set new timeout for the delayed execution
    timeout = setTimeout(later, wait);
  };
}