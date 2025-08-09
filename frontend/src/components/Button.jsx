/**
 * Enhanced Button Component
 * 
 * Provides comprehensive button functionality with micro-interactions,
 * loading states, and accessibility support.
 */

import React, { forwardRef } from 'react';
import { useAnimations, buttonEffects, hoverEffects, createRippleEffect } from '../lib/animations';
import { ariaUtils, keyboardNavigation, motionPreferences } from '../lib/accessibility';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  ripple = false,
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  type = 'button',
  ...props
}, ref) => {
  const { getAnimationClass } = useAnimations();
  
  // Check for reduced motion preference
  const shouldReduceMotion = motionPreferences.prefersReducedMotion();
  
  // Base button styles with enhanced accessibility
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-all duration-200 ease-in-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
    disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed
    ${!shouldReduceMotion ? getAnimationClass(buttonEffects.press) : ''}
    ${ripple && !shouldReduceMotion ? buttonEffects.ripple : ''}
  `;
  
  // Size variants
  const sizeStyles = {
    xs: 'h-7 px-2 text-xs gap-1',
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
    xl: 'h-12 px-8 text-lg gap-2.5',
  };
  
  // Variant styles
  const variantStyles = {
    primary: `
      bg-primary text-primary-foreground
      hover:bg-primary/90 hover:shadow-md
      ${getAnimationClass(hoverEffects.glow)}
    `,
    secondary: `
      bg-secondary text-secondary-foreground
      hover:bg-secondary/80
      ${getAnimationClass(hoverEffects.lift)}
    `,
    outline: `
      border border-input bg-background
      hover:bg-accent hover:text-accent-foreground
      ${getAnimationClass(hoverEffects.borderGlow)}
    `,
    ghost: `
      hover:bg-accent hover:text-accent-foreground
      ${getAnimationClass(hoverEffects.bgShift)}
    `,
    destructive: `
      bg-destructive text-destructive-foreground
      hover:bg-destructive/90 hover:shadow-md
      ${getAnimationClass(hoverEffects.glow)}
    `,
    success: `
      bg-success text-success-foreground
      hover:bg-success/90 hover:shadow-md
      ${getAnimationClass(hoverEffects.glow)}
    `,
    warning: `
      bg-warning text-warning-foreground
      hover:bg-warning/90 hover:shadow-md
      ${getAnimationClass(hoverEffects.glow)}
    `,
    link: `
      text-primary underline-offset-4
      hover:underline
    `,
  };
  
  // Loading styles
  const loadingStyles = loading ? buttonEffects.loading : '';
  
  // Handle click with ripple effect
  const handleClick = (event) => {
    if (ripple && !disabled && !loading) {
      createRippleEffect(event, event.currentTarget);
    }
    
    if (onClick && !disabled && !loading) {
      onClick(event);
    }
  };
  
  // Icon component
  const IconComponent = ({ icon, className }) => {
    if (typeof icon === 'string') {
      return <span className={className}>{icon}</span>;
    }
    
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, { className });
    }
    
    return null;
  };
  
  return (
    <button
      ref={ref}
      type={type}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${loadingStyles}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <div className="mr-2">
          <LoadingSpinner size={size} />
        </div>
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <IconComponent icon={icon} className="flex-shrink-0" />
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && !loading && (
        <IconComponent icon={icon} className="flex-shrink-0" />
      )}
    </button>
  );
});

// Loading spinner component
const LoadingSpinner = ({ size = 'md' }) => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };
  
  return (
    <div className={`${sizeMap[size]} animate-spin rounded-full border-2 border-current border-t-transparent`} />
  );
};

// Button group component
export const ButtonGroup = ({ 
  children, 
  orientation = 'horizontal',
  className = '',
  ...props 
}) => {
  const orientationStyles = {
    horizontal: 'flex-row [&>button:not(:first-child)]:ml-[-1px] [&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none',
    vertical: 'flex-col [&>button:not(:first-child)]:mt-[-1px] [&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-b-none [&>button:last-child]:rounded-t-none',
  };
  
  return (
    <div 
      className={`inline-flex ${orientationStyles[orientation]} ${className}`}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
};

// Icon button component
export const IconButton = forwardRef(({
  icon,
  'aria-label': ariaLabel,
  size = 'md',
  variant = 'ghost',
  className = '',
  ...props
}, ref) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11',
    xl: 'w-12 h-12',
  };
  
  return (
    <Button
      ref={ref}
      variant={variant}
      className={`${sizeMap[size]} p-0 ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </Button>
  );
});

Button.displayName = 'Button';
IconButton.displayName = 'IconButton';

export default Button;