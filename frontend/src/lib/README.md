# Design System Documentation

This directory contains the comprehensive design system for the Load Balancer Management Dashboard. The design system provides consistent styling, theming, and utility functions across the entire application.

## Files Overview

- `design-system.js` - Core design system utilities and constants
- `theme.js` - Theme management and configuration
- `README.md` - This documentation file

## Design System Features

### 🎨 Theme Management
- **Light/Dark Mode**: Automatic system detection with manual override
- **Theme Persistence**: User preferences saved to localStorage
- **CSS Custom Properties**: Theme-aware color system
- **Responsive Design**: Mobile-first approach with consistent breakpoints

### 🧩 Component System
- **Consistent Styling**: Unified button, form, and card components
- **Size Variants**: xs, sm, md, lg, xl sizing system
- **Status Colors**: Success, warning, error, info semantic colors
- **Accessibility**: WCAG 2.1 AA compliant components

### 📱 Responsive Utilities
- **Breakpoint System**: xs(475px), sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- **Grid Utilities**: Responsive grid helpers
- **Spacing Scale**: Consistent spacing throughout the app

## Usage Examples

### Basic Theme Usage

```javascript
import { themeManager, useTheme } from './lib/theme.js';

// In a React component
function MyComponent() {
  const { isDark, toggleMode, config } = useTheme();
  
  return (
    <button 
      onClick={toggleMode}
      className={`btn-primary ${isDark ? 'dark-specific-class' : ''}`}
    >
      Toggle Theme
    </button>
  );
}

// Direct theme manager usage
themeManager.setMode('dark');
themeManager.updateConfig({ density: 'compact' });
```

### Design System Utilities

```javascript
import { cn, responsive, statusClasses, gridCols } from './lib/design-system.js';

// Combine classes conditionally
const buttonClass = cn(
  'btn',
  'btn-primary',
  isLoading && 'opacity-50',
  disabled && 'cursor-not-allowed'
);

// Create responsive classes
const containerClass = responsive('container', {
  md: 'max-w-4xl',
  lg: 'max-w-6xl'
});

// Status-based styling
const statusClass = statusClasses('success', 'bg'); // Returns 'bg-success'

// Grid utilities
const gridClass = gridCols({ default: 1, md: 2, lg: 3 }); // Returns 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
```

### Component Classes

```jsx
// Button variants
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-outline">Outline Button</button>
<button className="btn-ghost">Ghost Button</button>

// Button sizes
<button className="btn-primary btn-sm">Small</button>
<button className="btn-primary btn-md">Medium</button>
<button className="btn-primary btn-lg">Large</button>

// Cards
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Card Title</h3>
    <p className="card-description">Card description</p>
  </div>
  <div className="card-content">
    Card content goes here
  </div>
  <div className="card-footer">
    Card footer
  </div>
</div>

// Form components
<div className="form-field">
  <label className="form-label">Label</label>
  <input className="form-input" type="text" placeholder="Enter text" />
  <p className="form-description">Helper text</p>
  <p className="form-error">Error message</p>
</div>

// Status indicators
<span className="status-dot status-healthy"></span>
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
```

## CSS Custom Properties

The design system uses CSS custom properties for theme-aware styling:

```css
/* Color system */
--color-primary: 59 130 246;
--color-background: 249 250 251;
--color-foreground: 17 24 39;

/* Typography */
--font-size-base: 1rem;
--line-height-base: 1.5rem;

/* Spacing */
--spacing-md: 1rem;
--spacing-lg: 1.5rem;

/* Shadows */
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

## Responsive Breakpoints

```css
/* Mobile first approach */
.responsive-example {
  @apply grid-cols-1;        /* Default: 1 column */
  @apply sm:grid-cols-2;     /* Small: 2 columns */
  @apply md:grid-cols-3;     /* Medium: 3 columns */
  @apply lg:grid-cols-4;     /* Large: 4 columns */
  @apply xl:grid-cols-6;     /* Extra large: 6 columns */
}
```

## Animation Classes

```css
/* Fade animations */
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
.animate-slide-up { animation: slideUp 0.3s ease-out; }
.animate-slide-down { animation: slideDown 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }

/* Hover effects */
.hover-lift { @apply transition-transform duration-200 hover:-translate-y-1; }
.hover-glow { @apply transition-shadow duration-200 hover:shadow-lg; }
.hover-scale { @apply transition-transform duration-200 hover:scale-105; }
```

## Accessibility Features

### Focus Management
```javascript
import { createFocusTrap, buttonProps } from './lib/design-system.js';

// Create focus trap for modals
const cleanup = createFocusTrap(modalElement);

// Generate accessible button props
const accessibleButtonProps = buttonProps({
  disabled: false,
  loading: true,
  'aria-label': 'Submit form'
});
```

### ARIA Utilities
```javascript
import { ariaProps } from './lib/design-system.js';

const ariaAttributes = ariaProps({
  'aria-label': 'Close dialog',
  'aria-expanded': isOpen,
  role: 'button'
});
```

## Performance Utilities

```javascript
import { debounce, throttle } from './lib/design-system.js';

// Debounce search input
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// Throttle scroll handler
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

## Theme Configuration

### Available Options

```javascript
const themeOptions = {
  modes: ['light', 'dark', 'system'],
  primaryColors: ['blue', 'green', 'purple', 'orange', 'red', 'pink'],
  borderRadius: ['none', 'sm', 'md', 'lg', 'xl'],
  density: ['compact', 'comfortable', 'spacious']
};
```

### Customization Example

```javascript
import { themeManager } from './lib/theme.js';

// Update theme configuration
themeManager.updateConfig({
  mode: 'dark',
  primaryColor: 'green',
  borderRadius: 'lg',
  density: 'compact'
});
```

## Best Practices

### 1. Use Semantic Classes
```css
/* Good */
.btn-primary { /* styles */ }
.status-healthy { /* styles */ }

/* Avoid */
.blue-button { /* styles */ }
.green-dot { /* styles */ }
```

### 2. Leverage CSS Custom Properties
```css
/* Good - theme aware */
.my-component {
  background-color: rgb(var(--color-card));
  color: rgb(var(--color-card-foreground));
}

/* Avoid - hardcoded colors */
.my-component {
  background-color: #ffffff;
  color: #000000;
}
```

### 3. Use Responsive Utilities
```javascript
// Good - responsive helper
const gridClass = gridCols({ default: 1, md: 2, lg: 3 });

// Good - Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### 4. Maintain Accessibility
```jsx
// Good - accessible button
<button 
  className="btn-primary"
  aria-label="Save changes"
  disabled={isLoading}
  aria-busy={isLoading}
>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

## Migration Guide

When updating existing components to use the new design system:

1. **Replace hardcoded colors** with theme-aware classes
2. **Update button classes** to use the new button system
3. **Add responsive classes** for better mobile experience
4. **Include accessibility attributes** for better screen reader support
5. **Use semantic status classes** instead of color-specific classes

### Before
```jsx
<button 
  style={{ backgroundColor: '#2563eb', color: 'white' }}
  className="px-4 py-2 rounded"
>
  Click me
</button>
```

### After
```jsx
<button className="btn-primary">
  Click me
</button>
```

## Contributing

When adding new components or utilities to the design system:

1. Follow the established naming conventions
2. Ensure accessibility compliance
3. Add responsive variants where appropriate
4. Include proper documentation
5. Test in both light and dark themes
6. Verify keyboard navigation works correctly

## Support

For questions about the design system or help with implementation, refer to:
- This documentation
- Component examples in the codebase
- Tailwind CSS documentation for utility classes
- WCAG guidelines for accessibility requirements