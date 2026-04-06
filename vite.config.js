import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // allow testing from mobile devices on local network
    port: 5173
  }
});
