import React from 'react';

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  text 
}: Readonly<LoadingSpinnerProps>) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]}
          border-gray-200 dark:border-gray-700 
          border-t-purple-600 dark:border-t-purple-400 
          rounded-full 
          animate-spin
        `}
      />
      {text && (
        <p className={`
          mt-3 
          text-gray-600 dark:text-gray-400 
          ${textSizes[size]}
          font-medium
        `}>
          {text}
        </p>
      )}
    </div>
  );
}

export function FullPageLoader({ text = "Loading..." }: Readonly<{ text?: string }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function InlineLoader({ text, size = 'sm' }: Readonly<{ text?: string; size?: 'sm' | 'md' | 'lg' }>) {
  return (
    <div className="flex items-center justify-center p-4">
      <LoadingSpinner size={size} text={text} />
    </div>
  );
}