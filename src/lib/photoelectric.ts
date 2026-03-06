// Shared physics constants, types, and functions for all simulation designs

export const PLANCK_EV = 4.136e-15;
export const SPEED_OF_LIGHT = 3e8;
export const HC_EV_NM = 1240;

export interface Metal {
  name: string;
  symbol: string;
  workFunction: number;
  color: string;
}

export const METALS: Record<string, Metal> = {
  sodium:    { name: 'Sodium',    symbol: 'Na', workFunction: 2.36, color: '#E8C060' },
  potassium: { name: 'Potassium', symbol: 'K',  workFunction: 2.30, color: '#C0A0F0' },
  calcium:   { name: 'Calcium',   symbol: 'Ca', workFunction: 2.90, color: '#98AACC' },
  zinc:      { name: 'Zinc',      symbol: 'Zn', workFunction: 4.30, color: '#78C8C0' },
  aluminum:  { name: 'Aluminum',  symbol: 'Al', workFunction: 4.08, color: '#909090' },
  copper:    { name: 'Copper',    symbol: 'Cu', workFunction: 4.70, color: '#C87533' },
  gold:      { name: 'Gold',      symbol: 'Au', workFunction: 5.10, color: '#FFD700' },
  platinum:  { name: 'Platinum',  symbol: 'Pt', workFunction: 6.35, color: '#D8D8D8' },
};

export const CONFIG = {
  wavelength:    { min: 200,  max: 700,  default: 400, step: 1   },
  intensity:     { min: 0,    max: 100,  default: 39,  step: 1   },
  voltage:       { min: -10,  max: 10,   default: 8,   step: 0.1 },
  maxCurrentA:       0.100,
  maxElectrons:      28,
  baseElectronSpeed: 1.8,
  spawnRate:         0.45,
  canvas:  { w: 700, h: 320 },
  tube:    { x: 78,  y: 52, w: 544, h: 206, r: 26 },
  cathode: { x: 132, w: 20, plateY: 72, plateH: 168 },
  anode:   { x: 548, w: 20, plateY: 72, plateH: 168 },
} as const;

export type GraphType = 'current-voltage' | 'current-intensity' | 'energy-frequency';

export function photonEnergyEV(nm: number): number {
  return HC_EV_NM / nm;
}

export function maxKineticEnergy(wavelengthNm: number, workFunctionEV: number): number {
  return photonEnergyEV(wavelengthNm) - workFunctionEV;
}

export function stoppingVoltage(keMaxEV: number): number {
  return Math.max(0, keMaxEV);
}

export function calculateCurrent(keMaxEV: number, voltageV: number, intensityPct: number): number {
  if (keMaxEV <= 0) return 0;
  const stopV = stoppingVoltage(keMaxEV);
  if (voltageV < -stopV) return 0;
  const iMax = (intensityPct / 100) * CONFIG.maxCurrentA;
  if (voltageV >= 0) return iMax;
  return iMax * (1 + voltageV / stopV);
}

export function wavelengthToRGBA(nm: number, alpha = 1): string {
  let r = 0, g = 0, b = 0;
  if      (nm < 380) { r = 0.55; g = 0;    b = 0.9;  }
  else if (nm < 440) { r = (440 - nm) / 60; g = 0;    b = 1;    }
  else if (nm < 490) { r = 0;    g = (nm - 440) / 50;  b = 1;    }
  else if (nm < 510) { r = 0;    g = 1;    b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1;    b = 0;    }
  else if (nm < 645) { r = 1;    g = (645 - nm) / 65;  b = 0;    }
  else if (nm <= 700){ r = 1;    g = 0;    b = 0;    }
  else               { r = 0.6;  g = 0;    b = 0;    }
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

export function wavelengthToCSS(nm: number): string {
  return wavelengthToRGBA(nm, 1);
}

export function getLightLabel(wavelength: number): string {
  if (wavelength < 380) return 'UV';
  if (wavelength < 440) return 'Violet';
  if (wavelength < 490) return 'Blue';
  if (wavelength < 560) return 'Green';
  if (wavelength < 590) return 'Yellow';
  if (wavelength < 625) return 'Orange';
  if (wavelength <= 700) return 'Red';
  return 'IR';
}
