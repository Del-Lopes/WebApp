import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dependências estáveis em chunks próprios: mudam pouco entre deploys, então
// o navegador mantém o cache delas quando só o código do app muda.
function manualChunks(id: string) {
  if (!id.includes('node_modules')) return;
  if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react';
  if (/node_modules[\/]@supabase[\/]/.test(id)) return 'supabase';
  // lucide-react fica de fora de propósito: num chunk único, todos os ícones
  // de todas as telas (inclusive as lazy) desceriam no primeiro acesso.
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
