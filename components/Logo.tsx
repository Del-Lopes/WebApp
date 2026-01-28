
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img 
    src="https://tradexperience.com.br/wp-content/uploads/2025/02/tradenew-white-m1-no-slogan-cropped.svg" 
    alt="Tradexperience Logo" 
    className={className} 
  />
);