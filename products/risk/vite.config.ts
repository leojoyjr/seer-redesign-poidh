import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 base:'./',
 plugins:[react()],
 build:{rollupOptions:{output:{manualChunks(id){
  if(id.includes('/data/chart.json'))return 'market-history';
  if(id.includes('/data/credora_api.json'))return 'credora-profiles';
  if(id.includes('node_modules'))return 'vendor';
 }}}},
});
