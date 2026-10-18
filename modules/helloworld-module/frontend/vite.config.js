import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Đường dẫn tương đối để Nginx serving trực tiếp tại /modules/helloworld/
  server: {
    port: 4003,
    cors: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});

