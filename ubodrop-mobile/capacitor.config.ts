import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ubodrop.app',
  appName: 'UBODROP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
