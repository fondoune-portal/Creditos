import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        loginStaff: resolve(__dirname, 'public/login-staff.html'),
        solicitud: resolve(__dirname, 'public/portals/solicitud.html'),
        analista: resolve(__dirname, 'public/portals/analista.html'),
        gerencia: resolve(__dirname, 'public/portals/gerencia.html'),
        firma: resolve(__dirname, 'public/portals/firma.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
