import { Platform } from 'react-native';

export const COLORS = {
  bg: '#050505',
  surface: '#121212',
  surfaceHL: '#1E1E1E',
  primary: '#00F0FF',
  secondary: '#FF003C',
  success: '#39FF14',
  warning: '#FF9F0A',
  error: '#FF453A',
  textPrimary: '#F0F0F0',
  textSecondary: '#888888',
  textDim: '#444444',
  border: '#333333',
  termBg: '#000000',
  termText: '#39FF14',
};

export const FONTS = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
};

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
