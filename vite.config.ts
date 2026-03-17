import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      host: '0.0.0.0', // Memungkinkan akses dari perangkat lain di jaringan
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      // Proxy Supabase API calls through dev server to match production (Vercel) behavior
      proxy: {
        '/rest/v1': {
          target: 'https://aezbtbqqmeuynjkqdxjz.supabase.co',
          changeOrigin: true,
          secure: true,
        },
        '/auth/v1': {
          target: 'https://aezbtbqqmeuynjkqdxjz.supabase.co',
          changeOrigin: true,
          secure: true,
        },
        '/storage/v1': {
          target: 'https://aezbtbqqmeuynjkqdxjz.supabase.co',
          changeOrigin: true,
          secure: true,
        },
        '/realtime/v1': {
          target: 'https://aezbtbqqmeuynjkqdxjz.supabase.co',
          changeOrigin: true,
          secure: true,
          ws: true,
        },
        '/functions/v1': {
          target: 'https://aezbtbqqmeuynjkqdxjz.supabase.co',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
