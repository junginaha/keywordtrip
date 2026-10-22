import { defineConfig } from '@apps-in-toss/web-framework/config';
export default defineConfig({
  appName: 'keytrip',
  brand: { displayName: '키트립', primaryColor: '#076A77', icon: '' },
  web: { host: 'localhost', port: 5173, commands: { dev: 'vite --host 0.0.0.0', build: 'npm run build' } },
  permissions: [],
  outdir: 'dist',
});
