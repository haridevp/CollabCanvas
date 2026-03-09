export type ThemeType = 'light' | 'dark' | 'system' | 'high-contrast';

const THEME_KEY = 'user-theme';

export const getStoredTheme = (): ThemeType | null => {
    return localStorage.getItem(THEME_KEY) as ThemeType | null;
};

export const setStoredTheme = (theme: ThemeType) => {
    localStorage.setItem(THEME_KEY, theme);
};

/**
 * Applies theme by setting the appropriate class on the HTML element
 * This uses Tailwind's class-based dark mode approach
 */
export const applyTheme = (theme: ThemeType) => {
    const html = document.documentElement;
    const currentClasses = Array.from(html.classList);
    
    console.log('🎨 Applying theme:', theme);
    console.log('📝 Current HTML classes before:', currentClasses);

    // Step 1: Remove all theme-related classes
    html.classList.remove('light', 'dark', 'high-contrast');
    
    // Step 2: Force a DOM update
    void html.offsetHeight;
    
    // Step 3: Add the appropriate theme class based on selection
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeToApply = prefersDark ? 'dark' : 'light';
        html.classList.add(themeToApply);
        console.log('✅ System theme applied:', themeToApply);
    } else if (theme === 'high-contrast') {
        html.classList.add('high-contrast', 'dark');
        console.log('✅ High contrast theme applied (with dark base)');
    } else {
        // Apply light or dark theme
        html.classList.add(theme);
        console.log('✅ Theme applied:', theme);
    }
    
    // Step 4: Verify the changes
    const finalClasses = Array.from(html.classList);
    console.log('📝 HTML classes after:', finalClasses);
    console.log('📊 Theme verification:');
    console.log('   - Has .light:', html.classList.contains('light'));
    console.log('   - Has .dark:', html.classList.contains('dark'));
    console.log('   - Has .high-contrast:', html.classList.contains('high-contrast'));
};

/**
 * Clears the stored theme and resets to default (no theme classes).
 * Used during logout so auth pages are rendered without any user theme.
 */
export const clearTheme = (): void => {
    localStorage.removeItem(THEME_KEY);
    const html = document.documentElement;
    html.classList.remove('light', 'dark', 'high-contrast');
};


