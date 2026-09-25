import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/**
 * Icon button component for icon-only actions
 * @param props - Button props including children and HTML button attributes
 */
export const IconButton = ({ children, ...props }: IconButtonProps) => (
  <button
    {...props}
    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50"
  >
    {children}
  </button>
);