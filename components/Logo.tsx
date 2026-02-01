
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
        alt="Tradexperience Mobile Logo" 
        className={className} 
      />
    );
  }

  return (
    <img 
      src="https://tradexperience.com.br/wp-content/uploads/2026/01/Design-sem-nome-15.png" 
      alt="Tradexperience Logo" 
      className={className} 
    />
  );
};