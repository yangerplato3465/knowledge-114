import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  publicDir: false,
  plugins: [react(), {
    name: 'homepage-module-boundary',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const forbidden = Object.keys(output.modules).filter(id => /(?:pixi|firebase|assets\/js\/)/i.test(id));
        if (forbidden.length) this.error(`首頁不應包含遊戲模組：${forbidden.join(', ')}`);
      }
    },
  }],
  build: {
    assetsDir: 'app-assets',
    rollupOptions: { input: 'next/index.html' },
  },
});
