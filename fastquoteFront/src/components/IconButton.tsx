import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, className = '', title }) => (
  <button
    type="button"
    className={`p-2 rounded-full hover:bg-gray-200 transition ${className}`}
    onClick={onClick}
    title={title}
  >
    {icon}
  </button>
);
