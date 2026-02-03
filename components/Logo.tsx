
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
        alt="AFK Trade Mobile Logo" 
        className={className} 
      />
    );
  }

  return (
    <img 
      src="/images/logo-icon.png" 
      alt="AFK Trade Logo" 
      className={className} 
    />
  );
};