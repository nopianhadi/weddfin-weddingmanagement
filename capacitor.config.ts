import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.venapictures.app',
  appName: 'weddfin',
  webDir: 'dist',
  server: {
    url: 'https://weddfin.netlify.app',
    cleartext: true
  }
};

export default config;
