/**
 * Navigation Utility Functions Module
 * 
 * Provides helper functions for handling external and internal navigation,
 * URL validation, and enhanced navigation patterns.
 * 
 * @module NavigationUtils
 */

/**
 * Opens a URL in a new browser tab with security best practices
 * 
 * This function uses `window.open` with security attributes to prevent
 * potential security vulnerabilities like tabnabbing.
 * 
 * @function openInNewTab
 * @param {string} url - The URL to open in a new tab
 * @param {Object} [options] - Optional configuration object (reserved for future use)
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Open external link in new tab
 * openInNewTab('https://example.com');
 * ```
 * 
 * @example
 * ```typescript
 * // Open documentation link
 * const handleDocsClick = () => {
 *   openInNewTab('https://docs.example.com/user-guide');
 * };
 * ```
 * 
 * @remarks
 * Security features included:
 * - `_blank`: Opens in new tab
 * - `noopener`: Prevents the new page from accessing `window.opener`
 * - `noreferrer`: Prevents sending the Referer header
 * 
 * These attributes prevent:
 * 1. Tabnabbing attacks
 * 2. Referrer leakage
 * 3. Window.opener security vulnerabilities
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/open} for more details
 * @see {@link https://owasp.org/www-community/attacks/Reverse_Tabnabbing} for tabnabbing security concerns
 */
export const openInNewTab = (url: string, options = {}) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Navigates to a page and scrolls to the top of the viewport
 * 
 * This function combines React Router navigation with scroll reset,
 * ensuring users always start at the top of the page after navigation.
 * 
 * @function navigateToTop
 * @param {Function} navigate - React Router's navigate function from useNavigate()
 * @param {string} path - The path to navigate to
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // In a React component with useNavigate
 * import { useNavigate } from 'react-router-dom';
 * 
 * function MyComponent() {
 *   const navigate = useNavigate();
 *   
 *   const handleClick = () => {
 *     navigateToTop(navigate, '/dashboard');
 *   };
 *   
 *   return <button onClick={handleClick}>Go to Dashboard</button>;
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // With route parameters
 * navigateToTop(navigate, `/profile/${userId}`);
 * ```
 * 
 * @remarks
 * Why scroll to top after navigation:
 * 1. Better UX: Users expect to see page content from the top
 * 2. Consistency: All page transitions start at the same position
 * 3. Accessibility: Screen readers start reading from the top
 * 4. Mobile optimization: Prevents awkward scroll positions on small screens
 * 
 * Note: This uses `window.scrollTo(0, 0)` which works in most browsers.
 * For smoother animations, consider using `window.scroll({ top: 0, behavior: 'smooth' })`
 */
export const navigateToTop = (navigate: Function, path: string) => {
  navigate(path);
  window.scrollTo(0, 0);
};

/**
 * Validates if a string is a properly formatted URL
 * 
 * Uses the built-in URL constructor to validate URL syntax.
 * Returns true for valid URLs, false for invalid ones.
 * 
 * @function isValidUrl
 * @param {string} url - The URL string to validate
 * @returns {boolean} True if the string is a valid URL, false otherwise
 * 
 * @example
 * ```typescript
 * // Validate user-provided URL
 * const userInput = 'https://example.com';
 * if (isValidUrl(userInput)) {
 *   console.log('Valid URL');
 * } else {
 *   console.log('Invalid URL');
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Use in form validation
 * const validateLinkInput = (value: string) => {
 *   if (value && !isValidUrl(value)) {
 *     return 'Please enter a valid URL (e.g., https://example.com)';
 *   }
 *   return '';
 * };
 * ```
 * 
 * @example
 * ```typescript
 * // Conditionally render link
 * const renderLink = (url: string) => {
 *   if (isValidUrl(url)) {
 *     return <a href={url} target="_blank" rel="noopener noreferrer">Visit Site</a>;
 *   }
 *   return <span>Invalid URL: {url}</span>;
 * };
 * ```
 * 
 * @remarks
 * URL validation criteria:
 * - Must include protocol (http://, https://, ftp://, etc.)
 * - Must have a valid domain structure
 * - Must parse successfully with the URL constructor
 * 
 * Limitations:
 * 1. Requires protocol prefix (relative URLs won't validate)
 * 2. Doesn't check if the URL actually exists/is reachable
 * 3. May not validate all edge cases (consider using a library like `validator.js` for production)
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL/URL} for URL constructor details
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};