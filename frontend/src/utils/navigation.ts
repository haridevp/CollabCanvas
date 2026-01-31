/**
 * Navigation utility functions
 * Provides helper functions for handling external and internal navigation
 */

/**
 * Opens a URL in a new tab
 * @param url - URL to open
 * @param options - Optional configuration
 */
export const openInNewTab = (url: string, options = {}) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Navigates to a page and scrolls to top
 * @param navigate - React Router navigate function
 * @param path - Path to navigate to
 */
export const navigateToTop = (navigate: Function, path: string) => {
  navigate(path);
  window.scrollTo(0, 0);
};

/**
 * Validates if a string is a valid URL
 * @param url - URL to validate
 * @returns Boolean indicating if URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};