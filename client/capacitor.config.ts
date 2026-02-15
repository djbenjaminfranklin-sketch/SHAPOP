import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shapop.app',
  appName: 'ShaPop',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
  server: {
    allowNavigation: ['*']
  }
};

export default config;
