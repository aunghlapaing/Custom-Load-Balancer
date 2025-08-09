/**
 * Animation Utilities and Micro-Interactions
 * 
 * Provides comprehensive animation utilities including hover effects,
 * loading animations, skeleton screens, page transitions, and data
 * visualization animations with accessibility support.
 */

import React from 'react';
import { useReducedMotion } from '../contexts/ThemeContext';

// Animation configuration
export const ANIMATION_CONFIG = {
  // Duration presets
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounceIn: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // Scale presets
  scale: {
    none: '1',
    subtle: '1.02',
    small: '1.05',
    medium: '1.1',
    large: '1.15',
  },
  
  // Transform presets
  transform: {
    slideUp: 'translateY(-10px)',
    slideDown: 'translateY(10px)',
    slideLeft: 'translateX(-10px)',
    slideRight: 'translateX(10px)',
    fadeIn: 'translateY(0) scale(1)',
    fadeOut: 'translateY(-10px) scale(0.95)',
  },
};

/**
 * Hook for animation-aware styling
 */
export function useAnimations() {
  const prefersReducedMotion = useReducedMotion();
  
  const getAnimationDuration = (duration) => {
    return prefersReducedMotion ? ANIMATION_CONFIG.duration.instant : duration;
  };
  
  const getAnimationClass = (animationClass) => {
    return prefersReducedMotion ? '' : animationClass;
  };
  
  return {
    prefersReducedMotion,
    getAnimationDuration,
    getAnimationClass,
    config: ANIMATION_CONFIG,
  };
}

/**
 * Hover effect utilities
 */
export const hoverEffects = {
  // Lift effect
  lift: 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg',
  liftSubtle: 'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md',
  
  // Scale effects
  scale: 'transition-transform duration-200 hover:scale-105',
  scaleSubtle: 'transition-transform duration-200 hover:scale-102',
  scaleLarge: 'transition-transform duration-200 hover:scale-110',
  
  // Glow effects
  glow: 'transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/25',
  glowSubtle: 'transition-shadow duration-200 hover:shadow-md hover:shadow-primary/10',
  
  // Color effects
  brighten: 'transition-all duration-200 hover:brightness-110',
  saturate: 'transition-all duration-200 hover:saturate-110',
  
  // Border effects
  borderGlow: 'transition-all duration-200 hover:border-primary hover:shadow-sm',
  borderPulse: 'transition-all duration-200 hover:border-primary hover:ring-2 hover:ring-primary/20',
  
  // Background effects
  bgShift: 'transition-colors duration-200 hover:bg-accent/80',
  bgGradient: 'transition-all duration-200 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10',
};

/**
 * Button interaction effects
 */
export const buttonEffects = {
  // Press effects
  press: 'transition-transform duration-75 active:scale-95',
  pressSubtle: 'transition-transform duration-75 active:scale-98',
  
  // Ripple effect (requires additional JS)
  ripple: 'relative overflow-hidden transition-all duration-200',
  
  // Loading states
  loading: 'opacity-75 cursor-not-allowed pointer-events-none',
  loadingPulse: 'animate-pulse opacity-75 cursor-not-allowed pointer-events-none',
  
  // Focus effects
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  focusWithin: 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
};

/**
 * Loading animation classes
 */
export const loadingAnimations = {
  // Spinner variations
  spin: 'animate-spin',
  spinSlow: 'animate-spin [animation-duration:2s]',
  spinFast: 'animate-spin [animation-duration:0.5s]',
  
  // Pulse variations
  pulse: 'animate-pulse',
  pulseSlow: 'animate-pulse [animation-duration:3s]',
  pulseFast: 'animate-pulse [animation-duration:1s]',
  
  // Bounce variations
  bounce: 'animate-bounce',
  bounceSlow: 'animate-bounce [animation-duration:2s]',
  
  // Custom loading animations
  breathe: 'animate-[breathe_2s_ease-in-out_infinite]',
  float: 'animate-[float_3s_ease-in-out_infinite]',
  shimmer: 'animate-[shimmer_2s_linear_infinite]',
};

/**
 * Skeleton screen utilities
 */
export const skeletonStyles = {
  base: 'animate-pulse bg-muted rounded',
  text: 'animate-pulse bg-muted rounded h-4',
  textSm: 'animate-pulse bg-muted rounded h-3',
  textLg: 'animate-pulse bg-muted rounded h-5',
  avatar: 'animate-pulse bg-muted rounded-full',
  card: 'animate-pulse bg-muted rounded-lg',
  button: 'animate-pulse bg-muted rounded-md h-10',
  input: 'animate-pulse bg-muted rounded-md h-10',
};

/**
 * Page transition utilities
 */
export const pageTransitions = {
  // Fade transitions
  fadeIn: 'animate-[fadeIn_0.3s_ease-out]',
  fadeOut: 'animate-[fadeOut_0.3s_ease-in]',
  
  // Slide transitions
  slideInUp: 'animate-[slideInUp_0.3s_ease-out]',
  slideInDown: 'animate-[slideInDown_0.3s_ease-out]',
  slideInLeft: 'animate-[slideInLeft_0.3s_ease-out]',
  slideInRight: 'animate-[slideInRight_0.3s_ease-out]',
  
  // Scale transitions
  scaleIn: 'animate-[scaleIn_0.2s_ease-out]',
  scaleOut: 'animate-[scaleOut_0.2s_ease-in]',
  
  // Combined transitions
  slideUpFade: 'animate-[slideUpFade_0.4s_ease-out]',
  slideDownFade: 'animate-[slideDownFade_0.4s_ease-out]',
};

/**
 * Data visualization animations
 */
export const chartAnimations = {
  // Entry animations
  drawLine: 'animate-[drawLine_1s_ease-out]',
  growBar: 'animate-[growBar_0.8s_ease-out]',
  expandPie: 'animate-[expandPie_1s_ease-out]',
  
  // Update animations
  morphLine: 'transition-all duration-500 ease-in-out',
  updateBar: 'transition-all duration-300 ease-out',
  
  // Hover animations
  highlightSegment: 'transition-all duration-200 hover:brightness-110 hover:scale-105',
  glowPoint: 'transition-all duration-200 hover:drop-shadow-lg',
};

/**
 * Stagger animation utility
 */
export function createStaggeredAnimation(items, delay = 100) {
  return items.map((item, index) => ({
    ...item,
    style: {
      ...item.style,
      animationDelay: `${index * delay}ms`,
    },
  }));
}

/**
 * Create ripple effect
 */
export function createRippleEffect(event, element) {
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  `;
  
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * Intersection Observer for scroll animations
 */
export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold]);
  
  return [elementRef, isVisible];
}

/**
 * Animation component wrapper
 */
export const AnimatedWrapper = ({ 
  children, 
  animation = 'fadeIn', 
  delay = 0, 
  duration = 'normal',
  className = '' 
}) => {
  const { getAnimationClass, getAnimationDuration } = useAnimations();
  
  return (
    <div 
      className={`${getAnimationClass(pageTransitions[animation])} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: getAnimationDuration(ANIMATION_CONFIG.duration[duration]),
      }}
    >
      {children}
    </div>
  );
};

export default {
  ANIMATION_CONFIG,
  useAnimations,
  hoverEffects,
  buttonEffects,
  loadingAnimations,
  skeletonStyles,
  pageTransitions,
  chartAnimations,
  createStaggeredAnimation,
  createRippleEffect,
  useScrollAnimation,
  AnimatedWrapper,
};