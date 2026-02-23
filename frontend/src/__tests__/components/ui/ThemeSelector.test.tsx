import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import ThemeSelector, { ThemeType } from '../../../components/ui/ThemeSelector';

// Mock the utils/theme module to spy on applyTheme and setStoredTheme
// We need to import actual to not break if we want to test side effects, 
// but for unit testing the component, mocking is safer.
// However, the component calls them directly.
// Let's rely on the real DOM update for integration test feel, 
// or simple spying if we want isolation. 
// Given the previous tests checked classList, let's keep it real but clean up.

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.clearAllMocks();
  });

  test('renders all theme options', () => {
    render(<ThemeSelector currentTheme="system" onThemeChange={vi.fn()} />);

    expect(screen.getByText('Theme Selection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Light theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Dark theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select System theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select High Contrast theme/i })).toBeInTheDocument();
  });

  test('displays the current theme passed via props', () => {
    render(<ThemeSelector currentTheme="dark" onThemeChange={vi.fn()} />);

    // Check if Dark button is pressed/active
    const darkBtn = screen.getByRole('button', { name: /Select Dark theme/i });
    expect(darkBtn).toHaveAttribute('aria-pressed', 'true');
    expect(darkBtn).toHaveTextContent('Active');

    // Check if summary shows Dark
    // The text "Dark theme for night time use" appears in the button description and potentially in the summary
    const descriptions = screen.getAllByText('Dark theme for night time use');
    expect(descriptions.length).toBeGreaterThan(0);
    expect(descriptions[0]).toBeInTheDocument();
  });

  test('calls onThemeChange when a theme button is clicked', () => {
    const onThemeChange = vi.fn();
    render(<ThemeSelector currentTheme="light" onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Select Dark theme/i }));

    expect(onThemeChange).toHaveBeenCalledTimes(1);
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  test('applies theme to DOM when prop changes (integration)', () => {
    const Wrapper = () => {
      const [theme, setTheme] = useState<ThemeType>('light');
      return (
        <ThemeSelector 
          currentTheme={theme} 
          onThemeChange={setTheme} 
        />
      );
    };

    render(<Wrapper />);

    // Initial state light
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Click dark
    fireEvent.click(screen.getByRole('button', { name: /Select Dark theme/i }));

    // Should update state -> trigger useEffect -> applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('user-theme')).toBe('dark');
  });

  test('reset to default calls onThemeChange with system', () => {
    const onThemeChange = vi.fn();
    render(<ThemeSelector currentTheme="dark" onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Reset theme to system default/i }));

    expect(onThemeChange).toHaveBeenCalledWith('system');
  });

  test('high-contrast applies correct classes when selected', () => {
     const Wrapper = () => {
      const [theme, setTheme] = useState<ThemeType>('light');
      return (
        <ThemeSelector 
          currentTheme={theme} 
          onThemeChange={setTheme} 
        />
      );
    };

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /Select High Contrast theme/i }));

    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    // The implementation of applyTheme for high-contrast usually adds 'dark' too or specific styles
    // Based on previous test expectation:
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
