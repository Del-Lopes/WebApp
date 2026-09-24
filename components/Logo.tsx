import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  className?: string;
  /** Mantido por compatibilidade; a arte agora é escolhida pelo tema. */
  variant?: 'default' | 'mobile';
}

// Duas artes do mesmo símbolo: logo-icon.png é branco + verde (para fundo
// escuro) e icon.png é escuro + verde (para fundo claro). A escolha segue o
// tema — antes seguia o lugar, e cada tema tinha um ponto com o logo apagado.
export const Logo: React.FC<LogoProps> = ({ className }) => {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? '/images/logo-icon.png' : '/icon.png'}
      alt="Trader AFK Logo"
      className={className}
    />
  );
};
