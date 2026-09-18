import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync } from 'node:fs';

const pages = readdirSync(new URL('./pages/', import.meta.url)).filter(file => file.endsWith('.html')).sort();

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  publicDir: false,
  plugins: [react(), {
    name: 'homepage-module-boundary',
    generateBundle(_options, bundle) {
      const visited = new Set<string>();
      const inspect = (fileName: string) => {
        if (visited.has(fileName)) return;
        visited.add(fileName);
        const output = bundle[fileName];
        if (!output || output.type !== 'chunk') return;
        const forbidden = Object.keys(output.modules).filter(id => /(?:pixi|firebase|assets\/js\/|src\/(?:games|lessons|content)\/|src\/app\/(?:Activities|TeacherTools))/i.test(id.replaceAll('\\', '/')));
        if (forbidden.length) this.error(`首頁不應包含遊戲模組：${forbidden.join(', ')}`);
        output.imports.forEach(inspect);
      };
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && output.isEntry && output.facadeModuleId?.replaceAll('\\', '/').endsWith('/index.html')) inspect(output.fileName);
      }
    },
  }],
  build: {
    assetsDir: 'app-assets',
    rollupOptions: { input: ['index.html', ...pages.map(file => `pages/${file}`)] },
  },
});
