import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shapop.app',
  appName: 'ShaPop',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    allowsInlineMediaPlayback: true,
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
