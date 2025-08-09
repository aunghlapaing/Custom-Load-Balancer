/**
 * Skeleton Loading Components
 * 
 * Provides various skeleton loading states for different UI components
 * with accessibility support and reduced motion preferences.
 */

import React from 'react';
// import { useAnimations, skeletonStyles } from '../lib/animations';

const Skeleton = ({ 
  className = '', 
  variant = 'base',
  width,
  height,
  children,
  ...props 
}) => {
  // Simple skeleton styles without animation dependencies
  const skeletonStyles = {
    base: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
    text: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4',
    textSm: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-3',
    textLg: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-5',
    avatar: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full',
    card: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg',
    button: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-10',
    input: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-10',
  };
  
  const baseClasses = skeletonStyles[variant] || skeletonStyles.base;
  
  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };
  
  return (
    <div 
      className={`${baseClasses} ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
      {...props}
    >
      {children}
    </div>
  );
};

// Specialized skeleton components
export const SkeletonText = ({ lines = 1, className = '', ...props }) => {
  if (lines === 1) {
    return <Skeleton variant="text" className={className} {...props} />;
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="text" 
          className={index === lines - 1 ? 'w-3/4' : 'w-full'}
          {...props}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = ({ className = '', ...props }) => (
  <div className={`p-4 space-y-4 ${className}`} {...props}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="avatar" className="w-10 h-10" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="textSm" className="w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex space-x-2">
      <Skeleton variant="button" className="w-20" />
      <Skeleton variant="button" className="w-16" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, className = '', ...props }) => (
  <div className={`space-y-3 ${className}`} {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} variant="text" className="flex-1 h-5" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={`cell-${rowIndex}-${colIndex}`} 
            variant="text" 
            className="flex-1 h-4" 
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    <div className="flex justify-between items-center">
      <Skeleton variant="text" className="w-32 h-6" />
      <Skeleton variant="text" className="w-20 h-4" />
    </div>
    <div className="h-64 flex items-end space-x-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="base" 
          className="flex-1"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        />
      ))}
    </div>
    <div className="flex justify-between">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} variant="textSm" className="w-8" />
      ))}
    </div>
  </div>
);

export const SkeletonMetricCard = ({ className = '', ...props }) => (
  <div className={`p-6 space-y-4 ${className}`} {...props}>
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-24 h-4" />
      <Skeleton variant="base" className="w-8 h-8 rounded-full" />
    </div>
    <Skeleton variant="text" className="w-16 h-8" />
    <div className="flex items-center space-x-2">
      <Skeleton variant="base" className="w-4 h-4" />
      <Skeleton variant="textSm" className="w-20" />
    </div>
  </div>
);

export const SkeletonList = ({ items = 5, className = '', ...props }) => (
  <div className={`space-y-3 ${className}`} {...props}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3">
        <Skeleton variant="avatar" className="w-8 h-8" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="textSm" className="w-1/2" />
        </div>
        <Skeleton variant="base" className="w-6 h-6" />
      </div>
    ))}
  </div>
);

export const SkeletonForm = ({ fields = 4, className = '', ...props }) => (
  <div className={`space-y-6 ${className}`} {...props}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="input" className="w-full" />
      </div>
    ))}
    <div className="flex space-x-3 pt-4">
      <Skeleton variant="button" className="w-24" />
      <Skeleton variant="button" className="w-20" />
    </div>
  </div>
);

export default Skeleton;