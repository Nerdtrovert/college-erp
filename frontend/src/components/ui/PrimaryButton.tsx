import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/**
 * Primary button component for main actions
 * @param props - Button props including children and HTML button attributes
 */
export const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => (
  <button
    {...props}
    className="inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200"
  >
    {children}
  </button>
);