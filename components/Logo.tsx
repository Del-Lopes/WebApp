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
// Versões de 128px: o logo aparece com 28–40px; os originais (1024/512px)
// ficam para e-mails e landing.
export const Logo: React.FC<LogoProps> = ({ className }) => {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? '/images/logo-icon-128.png' : '/icon-128.png'}
      alt="Trader AFK Logo"
      width={128}
      height={128}
      className={className}
    />
  );
};
