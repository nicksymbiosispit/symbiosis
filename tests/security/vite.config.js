import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  plugins:[react()],
  build:{outDir:'.security-dist',rollupOptions:{input:{
    app:fileURLToPath(new URL('../../index.html',import.meta.url)),
    fixture:fileURLToPath(new URL('./fixture.html',import.meta.url))
  }}}
});
