/**
 * Theme Toggle Component
 * 
 * Provides a simple toggle button for switching between light/dark themes
 */

import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ThemeToggle = ({ className = '', size = 'md', showLabel = false }) => {
  const { effectiveMode, toggleMode, isLoading } = useTheme();

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse bg-muted rounded-md`} />
    );
  }

  return (
    <button
      onClick={toggleMode}
      className={`
        ${sizeClasses[size]} 
        ${className}
        inline-flex items-center justify-center
        rounded-md
        text-muted-foreground hover:text-foreground hover:bg-accent
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
      `}
      title={`Switch to ${effectiveMode === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${effectiveMode === 'dark' ? 'light' : 'dark'} mode`}
    >
      {effectiveMode === 'dark' ? (
        <SunIcon className={iconSize[size]} />
      ) : (
        <MoonIcon className={iconSize[size]} />
      )}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {effectiveMode === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};

// Simple SVG icons
const SunIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default ThemeToggle;