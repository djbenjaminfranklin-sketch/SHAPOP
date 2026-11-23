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
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: false,
  },
  server: {
    allowNavigation: ['*.supabase.co', '*.stripe.com', '*.onrender.com']
  },
  plugins: {
    // Android 15+ (bord à bord) : la WebView reçoit les vraies marges des barres système
    // (--safe-area-inset-*, et env() avec viewport-fit=cover). Icônes foncées au démarrage
    // (thème clair par défaut) ; App.tsx les passe en clair si l'utilisateur choisit le thème sombre.
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
