import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/cn';
import { avatarSrc, useAvatarKey } from '../../lib/avatars';

// Foto de perfil em círculo; sem foto (ou se ela falhar ao carregar), mostra a inicial do nome.
// Passe `userId` para buscar a foto do usuário (pedido em lote e com cache).
export const Avatar: React.FC<{ name: string; userId?: string | null; className?: string; deleted?: boolean }> = ({ name, userId, className, deleted }) => {
  const key = useAvatarKey(userId);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [key]);

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/20 bg-accent/10 text-sm font-semibold text-accent-fg',
        className,
      )}
      aria-hidden
    >
      {deleted ? (
        <User size={18} className="text-fg-subtle" />
      ) : key && !failed ? (
        <img src={avatarSrc(key)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase() || '?'
      )}
    </div>
  );
};
