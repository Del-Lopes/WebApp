import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 32 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-label="Tradexperience Logo"
  >
    {/* Green Candle (Bullish) - Top Right */}
    <rect 
      x="17" 
      y="3" 
      width="6" 
      height="14" 
      rx="1" 
      transform="rotate(25 20 10)" 
      fill="#22c55e" 
    />
    <path 
      d="M21.5 3.5 L23.5 0" 
      stroke="#22c55e" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />

    {/* Red Candle (Bearish) - Bottom Left */}
    <rect 
      x="9" 
      y="15" 
      width="6" 
      height="14" 
      rx="1" 
      transform="rotate(25 12 22)" 
      fill="#ef4444" 
    />
    <path 
      d="M10.5 28.5 L8.5 32" 
      stroke="#ef4444" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);