import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyTheme, clearTheme, getStoredTheme } from '../utils/theme';

/**
 * ThemeManager
 * 
 * Intercepts route navigation to conditionally append or strip structural
 * global tailwind CSS configuration tags (like 'dark', 'high-contrast') from the parent <HTML> tag
 * based on allowed domains (`/dashboard`, `/profile`).
 * Keeps auth pages (`/login`, `/register`) and canvas maps (`/room/:id`) strictly un-themed
 * to ensure legibility and consistent light-mode fallback.
 */
export const ThemeManager = () => {
    const location = useLocation();

    // The authorized routes where we apply user themes
    const themedRoutes = ['/dashboard', '/profile'];

    useEffect(() => {
        // Evaluate if the current route starts with any of the allowed paths
        const isThemedRoute = themedRoutes.some(route => location.pathname.startsWith(route));

        if (isThemedRoute) {
            // Reapply existing or system default themes
            const storedTheme = getStoredTheme();
            applyTheme(storedTheme || 'system');
        } else {
            // Strip structural tags preventing bleed-outs
            clearTheme();
        }
    }, [location.pathname]);

    // Independent effect listening to OS structural toggle defaults
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
             // Only evaluate if we're technically in a themed boundary to begin with
            const isThemedRoute = themedRoutes.some(route => location.pathname.startsWith(route));
            if (!isThemedRoute) return;

            const currentTheme = getStoredTheme();
            if (!currentTheme || currentTheme === 'system') {
                console.log('🔄 System theme preference changed');
                applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [location.pathname]);

    // Lightweight headless invisible component
    return null;
};
