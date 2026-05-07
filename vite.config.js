import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';
import birdManifest from './vite-plugin-bird-manifest.js';

export default defineConfig({
  plugins: [
    birdManifest(),
    qrcode(),
  ],
  server: {
    host: '0.0.0.0', // allow testing from mobile devices on local network
    port: 5174
  }
});
