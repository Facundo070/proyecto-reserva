import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ies6001.reserva',
  appName: 'Reserva.app',
  webDir: 'dist/ies6001-frontend/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;