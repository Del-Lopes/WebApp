// Versão da Política de Privacidade vigente (public/legal/privacidade.html).
export const PRIVACY_VERSION = '2026-11-01';

export const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
};

// Até 11 dígitos é número brasileiro sem DDI (DDD + telefone).
export const whatsappUrl = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};
