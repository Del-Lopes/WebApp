
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'mobile';
}

export const Logo: React.FC<LogoProps> = ({ className, variant = 'default' }) => {
  if (variant === 'mobile') {
    return (
      <img 
        src="/icon.png" 
        alt="Trader AFK Mobile Logo" 
        className={className} 
      />
    );
  }

  return (
    <img 
      src="/images/logo-icon.png" 
      alt="Trader AFK Logo" 
      className={className} 
    />
  );
};