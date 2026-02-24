import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shapop.app',
  appName: 'ShaPop',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    allowsInlineMediaPlayback: true,
    backgroundColor: '#0a0a0a',
    scrollEnabled: false,
  },
  server: {
    allowNavigation: ['*.supabase.co', '*.stripe.com', '*.onrender.com']
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
