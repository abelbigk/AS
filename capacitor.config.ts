import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contentorganizer.app',
  appName: 'Content Organizer',
  webDir: 'dist/public',
  server: {
    // For development: point to your local server
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  }
};

export default config;
