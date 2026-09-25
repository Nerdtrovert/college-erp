import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable button component with variants and sizes
 * @param props - Button props including variant, size, and HTML button attributes
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'border border-blue-200 bg-blue-100 text-blue-800 hover:border-blue-300 hover:bg-blue-200',
    secondary: 'border border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300 hover:bg-gray-100',
    outline: 'border border-transparent bg-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50'
  };

  const sizeClasses = {
    sm: 'h-9 w-32 text-sm',
    md: 'h-10 min-w-32 px-5 py-2 text-sm',
    lg: 'h-11 min-w-40 px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};