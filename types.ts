export enum PhoneState {
  LOCKED = 'LOCKED',
  HOME = 'HOME',
  SETTINGS_MAIN = 'SETTINGS_MAIN',
  SETTINGS_SECURITY = 'SETTINGS_SECURITY',
  SETTINGS_PHANTOM = 'SETTINGS_PHANTOM',
  POWER_MENU = 'POWER_MENU',
  AUTH_TRAP = 'AUTH_TRAP',
  FAKE_SHUTDOWN = 'FAKE_SHUTDOWN', // The Spy Mode
  REAL_SHUTDOWN = 'REAL_SHUTDOWN', // The Owner Mode
  HARD_LOCKED = 'HARD_LOCKED' // Remote Lock
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  details: string;
  type: 'info' | 'alert' | 'danger';
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PhantomConfig {
  enabled: boolean;
  fakeShutdown: boolean;
  sensitivity: string;
  recoveryEmail: string;
  emergencyContact: string;
  masterPin: string;
  isConfigured: boolean;
  bleBeacon: boolean;
}