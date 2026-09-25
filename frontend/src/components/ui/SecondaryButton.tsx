import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/**
 * Secondary button component for less prominent actions
 * @param props - Button props including children and HTML button attributes
 */
export const SecondaryButton = ({ children, ...props }: SecondaryButtonProps) => (
  <button
    {...props}
    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
  >
    {children}
  </button>
);