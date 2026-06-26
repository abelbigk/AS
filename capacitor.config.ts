import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contentorganizer.app',
  appName: 'AS',
  webDir: 'dist/public',
  server: {
    // Production: Point to your Render backend
    url: 'https://content-organizer.onrender.com',
    cleartext: false
    
    // For local development, uncomment this instead:
    // url: 'http://192.168.1.100:5000',
    // cleartext: true
  }
};

export default config;
