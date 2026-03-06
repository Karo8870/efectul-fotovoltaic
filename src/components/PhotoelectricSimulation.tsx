'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ================================================================
// PHYSICS CONSTANTS
// ================================================================
const PLANCK_EV = 4.136e-15; // Planck's constant in eV·s
const SPEED_OF_LIGHT = 3e8;  // m/s
const HC_EV_NM = 1240;       // hc in eV·nm  (E = hc/λ → E[eV] = 1240/λ[nm])

// ================================================================
// METALS DATABASE  — add/remove metals or change values here
// ================================================================
interface Metal {
  name: string;
  symbol: string;
  workFunction: number; // eV
  color: string;        // plate visual color
}

const METALS: Record<string, Metal> = {
  sodium:    { name: 'Sodium',    symbol: 'Na', workFunction: 2.36, color: '#E8C060' },
  potassium: { name: 'Potassium', symbol: 'K',  workFunction: 2.30, color: '#C0A0F0' },
  calcium:   { name: 'Calcium',   symbol: 'Ca', workFunction: 2.90, color: '#98AACC' },
  zinc:      { name: 'Zinc',      symbol: 'Zn', workFunction: 4.30, color: '#78C8C0' },
  aluminum:  { name: 'Aluminum',  symbol: 'Al', workFunction: 4.08, color: '#909090' },
  copper:    { name: 'Copper',    symbol: 'Cu', workFunction: 4.70, color: '#C87533' },
  gold:      { name: 'Gold',      symbol: 'Au', workFunction: 5.10, color: '#FFD700' },
  platinum:  { name: 'Platinum',  symbol: 'Pt', workFunction: 6.35, color: '#D8D8D8' },
};

// ================================================================
// SIMULATION CONFIG — all limits/defaults easily editable here
// ================================================================
const CONFIG = {
  wavelength:    { min: 200,  max: 700,  default: 400, step: 1   },  // nm
  intensity:     { min: 0,    max: 100,  default: 39,  step: 1   },  // %
  voltage:       { min: -10,  max: 10,   default: 8,   step: 0.1 },  // V

  maxCurrentA:      0.100,  // Amperes at 100% intensity (display scale)
  maxElectrons:     28,     // max particles on screen at once
  baseElectronSpeed: 1.8,   // canvas px per frame (base speed)
  spawnRate:        0.45,   // base probability of spawning an electron per frame

  // Canvas geometry (pixels) — change to resize/reposition elements
  canvas: { w: 700, h: 320 },
  tube:   { x: 78, y: 52, w: 544, h: 206, r: 26 },
  cathode: { x: 132, w: 20, plateY: 72, plateH: 168 },
  anode:   { x: 548, w: 20, plateY: 72, plateH: 168 },
} as const;

// ================================================================
// PHYSICS FUNCTIONS
// ================================================================

function photonEnergyEV(nm: number): number {
  return HC_EV_NM / nm;
}

function maxKineticEnergy(wavelengthNm: number, workFunctionEV: number): number {
  return photonEnergyEV(wavelengthNm) - workFunctionEV;
}

function stoppingVoltage(keMaxEV: number): number {
  return Math.max(0, keMaxEV);
}

function calculateCurrent(keMaxEV: number, voltageV: number, intensityPct: number): number {
  if (keMaxEV <= 0) return 0;
  const stopV = stoppingVoltage(keMaxEV);
  if (voltageV < -stopV) return 0;
  const iMax = (intensityPct / 100) * CONFIG.maxCurrentA;
  if (voltageV >= 0) return iMax;
  // Linear decrease from iMax→0 as voltage goes 0→−stopV
  return iMax * (1 + voltageV / stopV);
}

// ================================================================
// WAVELENGTH → COLOR HELPERS
// ================================================================

function wavelengthToRGBA(nm: number, alpha = 1): string {
  let r = 0, g = 0, b = 0;
  if      (nm < 380) { r = 0.55; g = 0;    b = 0.9;  }  // UV glow
  else if (nm < 440) { r = (440 - nm) / 60; g = 0;    b = 1;    }
  else if (nm < 490) { r = 0;    g = (nm - 440) / 50;  b = 1;    }
  else if (nm < 510) { r = 0;    g = 1;    b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1;    b = 0;    }
  else if (nm < 645) { r = 1;    g = (645 - nm) / 65;  b = 0;    }
  else if (nm <= 700){ r = 1;    g = 0;    b = 0;    }
  else               { r = 0.6;  g = 0;    b = 0;    }  // IR glow
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

function wavelengthToCSS(nm: number): string {
  return wavelengthToRGBA(nm, 1);
}

// ================================================================
// CANVAS DRAWING
// ================================================================

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface ElectronParticle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  energy: number;   // base KE in eV (at emission)
  alpha: number;
  returning: boolean;
}

let eid = 0;

function drawFrame(
  ctx: CanvasRenderingContext2D,
  wavelength: number,
  intensity: number,
  voltage: number,
  metal: Metal,
  electrons: ElectronParticle[],
  keMax: number,
  tick: number,
) {
  const { w: W, h: H } = CONFIG.canvas;
  const { x: TX, y: TY, w: TW, h: TH, r: TR } = CONFIG.tube;
  const { x: CX, w: CW, plateY: PY, plateH: PH } = CONFIG.cathode;
  const { x: AX, w: AW } = CONFIG.anode;

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, W, H);

  // Dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let gx = 20; gx < W; gx += 32) {
    for (let gy = 20; gy < H; gy += 32) {
      ctx.beginPath();
      ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Light Beam ───────────────────────────────────────────────
  if (intensity > 0) {
    const flicker = 0.85 + 0.15 * Math.sin(tick * 0.18);
    const beamAlpha = (intensity / 100) * 0.65 * flicker;
    const cathodeMidY = PY + PH / 2;

    // Cone from top-left corner to cathode plate face
    const gradient = ctx.createLinearGradient(0, 0, CX, cathodeMidY);
    gradient.addColorStop(0, wavelengthToRGBA(wavelength, 0));
    gradient.addColorStop(1, wavelengthToRGBA(wavelength, beamAlpha));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CX, PY - 4);
    ctx.lineTo(CX, PY + PH + 4);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Cathode glow when emitting
    if (keMax > 0) {
      const glowR = ctx.createRadialGradient(CX, cathodeMidY, 0, CX, cathodeMidY, 55);
      glowR.addColorStop(0, wavelengthToRGBA(wavelength, 0.35 * flicker));
      glowR.addColorStop(1, wavelengthToRGBA(wavelength, 0));
      ctx.fillStyle = glowR;
      ctx.fillRect(CX - 15, PY - 10, 70, PH + 20);
    }
  }

  // ── Glass Tube ───────────────────────────────────────────────
  // Outer glow ring
  ctx.save();
  ctx.shadowColor = 'rgba(80,160,255,0.18)';
  ctx.shadowBlur = 18;
  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(100,170,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Glass fill
  roundRect(ctx, TX, TY, TW, TH, TR);
  const glassFill = ctx.createLinearGradient(TX, TY, TX, TY + TH);
  glassFill.addColorStop(0, 'rgba(80,130,210,0.10)');
  glassFill.addColorStop(0.5, 'rgba(40,80,160,0.05)');
  glassFill.addColorStop(1, 'rgba(60,110,190,0.10)');
  ctx.fillStyle = glassFill;
  ctx.fill();

  // Glass border
  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(120,180,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Inner top-edge shine
  ctx.beginPath();
  ctx.moveTo(TX + TR + 2, TY + 5);
  ctx.lineTo(TX + TW - TR - 2, TY + 5);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Inner lead wires (top & bottom of plates) ────────────────
  const cathodeMidX = CX + CW / 2;
  const anodeMidX = AX + AW / 2;

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(150,150,150,0.25)';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(cathodeMidX, PY);
  ctx.lineTo(cathodeMidX, TY + 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(anodeMidX, PY + PH);
  ctx.lineTo(anodeMidX, TY + TH - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Cathode Plate ─────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = metal.color;
  ctx.shadowBlur = keMax > 0 && intensity > 0 ? 12 : 4;
  const cathGrad = ctx.createLinearGradient(CX, 0, CX + CW, 0);
  cathGrad.addColorStop(0, metal.color + 'AA');
  cathGrad.addColorStop(0.5, metal.color);
  cathGrad.addColorStop(1, metal.color + 'CC');
  ctx.fillStyle = cathGrad;
  ctx.fillRect(CX, PY, CW, PH);

  // Metal symbol
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,14,26,0.9)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(metal.symbol, CX + CW / 2, PY + PH / 2 + 4);
  ctx.restore();

  // Small electron dots on cathode surface (static, decorative)
  if (intensity > 0) {
    ctx.fillStyle = wavelengthToRGBA(wavelength, 0.5);
    for (let d = 0; d < 5; d++) {
      const dy = PY + 20 + d * 28;
      ctx.beginPath();
      ctx.arc(CX + CW + 3, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Anode Plate ───────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = '#8B7355';
  ctx.shadowBlur = 4;
  const anodeGrad = ctx.createLinearGradient(AX, 0, AX + AW, 0);
  anodeGrad.addColorStop(0, '#5A4025');
  anodeGrad.addColorStop(0.5, '#9B7555');
  anodeGrad.addColorStop(1, '#6B5035');
  ctx.fillStyle = anodeGrad;
  ctx.fillRect(AX, PY, AW, PH);
  ctx.restore();

  // ── Plate Labels ─────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(130,200,255,0.65)';
  ctx.fillText('cathode (−)', cathodeMidX, TY - 8);
  ctx.fillStyle = 'rgba(200,160,100,0.65)';
  ctx.fillText('anode (+)', anodeMidX, TY - 8);

  // ── External circuit wires (going down from tube) ─────────────
  const wireY = TY + TH;
  ctx.strokeStyle = 'rgba(180,180,200,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);

  ctx.beginPath();
  ctx.moveTo(cathodeMidX, wireY);
  ctx.lineTo(cathodeMidX, wireY + 28);
  ctx.lineTo(TX + 30, wireY + 28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(anodeMidX, wireY);
  ctx.lineTo(anodeMidX, wireY + 28);
  ctx.lineTo(TX + TW - 30, wireY + 28);
  ctx.stroke();
  ctx.setLineDash([]);

  // Wire end dots
  ctx.fillStyle = 'rgba(180,200,240,0.5)';
  [[TX + 30, wireY + 28], [TX + TW - 30, wireY + 28]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── Electrons ────────────────────────────────────────────────
  for (const e of electrons) {
    ctx.save();
    if (e.returning) {
      ctx.shadowColor = '#FF9900';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,160,50,${e.alpha})`;
      ctx.fill();
    } else {
      ctx.shadowColor = '#60A5FA';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,180,255,${e.alpha})`;
      ctx.fill();
      // Inner bright core
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${e.alpha * 0.9})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Voltage polarity indicator ────────────────────────────────
  if (voltage !== 0) {
    const posX = voltage > 0 ? AX + AW + 6 : CX - 10;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = voltage > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)';
    ctx.fillText(voltage > 0 ? '+' : '−', posX, PY + PH / 2 + 5);
  }
}

// ================================================================
// GRAPH COMPONENT (SVG)
// ================================================================

type GraphType = 'current-voltage' | 'current-intensity' | 'energy-frequency';

interface GraphProps {
  type: GraphType;
  wavelength: number;
  intensity: number;
  voltage: number;
  metal: Metal;
  keMax: number;
  gw?: number;
  gh?: number;
}

function Graph({ type, wavelength, intensity, voltage, metal, keMax, gw = 400, gh = 190 }: GraphProps) {
  const W = gw, H = gh;
  const PAD = { top: 16, right: 16, bottom: 36, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const mapX = (val: number, lo: number, hi: number) =>
    PAD.left + ((val - lo) / (hi - lo)) * plotW;
  const mapY = (val: number, lo: number, hi: number) =>
    PAD.top + plotH - ((val - lo) / (hi - lo)) * plotH;

  const stopV = stoppingVoltage(keMax);
  const currI = calculateCurrent(keMax, voltage, intensity);

  if (type === 'current-voltage') {
    const vLo = CONFIG.voltage.min, vHi = CONFIG.voltage.max;
    const iHi = CONFIG.maxCurrentA;

    // Build the I-V curve
    const pts: string[] = [];
    const step = (vHi - vLo) / 200;
    for (let v = vLo; v <= vHi + step / 2; v += step) {
      const i = keMax <= 0 ? 0 : v < -stopV ? 0 : v >= 0 ? (intensity / 100) * iHi
        : (intensity / 100) * iHi * (1 + v / stopV);
      pts.push(`${mapX(v, vLo, vHi).toFixed(1)},${mapY(i, 0, iHi).toFixed(1)}`);
    }
    const pathD = 'M' + pts.join(' L');
    const dotX = mapX(voltage, vLo, vHi);
    const dotY = mapY(currI, 0, iHi);

    return (
      <svg width={W} height={H} className="overflow-visible">
        {/* Grid */}
        {[0, 0.025, 0.05, 0.075, 0.1].map(v => (
          <line key={v} x1={PAD.left} y1={mapY(v, 0, iHi)} x2={PAD.left + plotW}
            y2={mapY(v, 0, iHi)} stroke="#1e293b" strokeWidth={1} />
        ))}
        {[-10, -5, 0, 5, 10].map(v => (
          <line key={v} x1={mapX(v, vLo, vHi)} y1={PAD.top}
            x2={mapX(v, vLo, vHi)} y2={PAD.top + plotH} stroke="#1e293b" strokeWidth={1} />
        ))}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH}
          stroke="#334155" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW}
          y2={PAD.top + plotH} stroke="#334155" strokeWidth={1.5} />
        {/* Zero-voltage line */}
        <line x1={mapX(0, vLo, vHi)} y1={PAD.top} x2={mapX(0, vLo, vHi)}
          y2={PAD.top + plotH} stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
        {/* Y ticks */}
        {[0, 25, 50, 75, 100].map(pct => {
          const val = pct / 1000;
          return (
            <g key={pct}>
              <line x1={PAD.left - 4} y1={mapY(val, 0, iHi)}
                x2={PAD.left} y2={mapY(val, 0, iHi)} stroke="#475569" strokeWidth={1} />
              <text x={PAD.left - 6} y={mapY(val, 0, iHi) + 3.5}
                textAnchor="end" fill="#64748b" fontSize={9}>{pct}</text>
            </g>
          );
        })}
        {/* X ticks */}
        {[-10, -5, 0, 5, 10].map(v => (
          <g key={v}>
            <line x1={mapX(v, vLo, vHi)} y1={PAD.top + plotH}
              x2={mapX(v, vLo, vHi)} y2={PAD.top + plotH + 4} stroke="#475569" strokeWidth={1} />
            <text x={mapX(v, vLo, vHi)} y={PAD.top + plotH + 13}
              textAnchor="middle" fill="#64748b" fontSize={9}>{v}</text>
          </g>
        ))}
        {/* Stopping voltage marker */}
        {stopV > 0 && (
          <g>
            <line x1={mapX(-stopV, vLo, vHi)} y1={PAD.top}
              x2={mapX(-stopV, vLo, vHi)} y2={PAD.top + plotH}
              stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
            <text x={mapX(-stopV, vLo, vHi)} y={PAD.top - 4}
              textAnchor="middle" fill="#ef4444" fontSize={8}>−V<tspan fontSize={6} dy={2}>stop</tspan></text>
          </g>
        )}
        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize={11}>
          Voltage (V)
        </text>
        <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11}
          transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>
          Current (mA)
        </text>
        {/* Curve */}
        <path d={pathD} stroke="#60a5fa" strokeWidth={2.2} fill="none" />
        {/* Operating point */}
        <circle cx={dotX} cy={dotY} r={5.5} fill="#fbbf24" stroke="#080c18" strokeWidth={1.5} />
      </svg>
    );
  }

  if (type === 'current-intensity') {
    const iHi = CONFIG.maxCurrentA;
    const pts: string[] = [];
    for (let pct = 0; pct <= 100; pct += 0.5) {
      const i = calculateCurrent(keMax, voltage, pct);
      pts.push(`${mapX(pct, 0, 100).toFixed(1)},${mapY(i, 0, iHi).toFixed(1)}`);
    }
    const pathD = 'M' + pts.join(' L');
    const dotX = mapX(intensity, 0, 100);
    const dotY = mapY(currI, 0, iHi);

    return (
      <svg width={W} height={H} className="overflow-visible">
        {[0, 0.025, 0.05, 0.075, 0.1].map(v => (
          <line key={v} x1={PAD.left} y1={mapY(v, 0, iHi)} x2={PAD.left + plotW}
            y2={mapY(v, 0, iHi)} stroke="#1e293b" strokeWidth={1} />
        ))}
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={mapX(v, 0, 100)} y1={PAD.top}
            x2={mapX(v, 0, 100)} y2={PAD.top + plotH} stroke="#1e293b" strokeWidth={1} />
        ))}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH}
          stroke="#334155" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW}
          y2={PAD.top + plotH} stroke="#334155" strokeWidth={1.5} />
        {[0, 25, 50, 75, 100].map(pct => {
          const val = pct / 1000;
          return (
            <g key={pct}>
              <line x1={PAD.left - 4} y1={mapY(val, 0, iHi)}
                x2={PAD.left} y2={mapY(val, 0, iHi)} stroke="#475569" strokeWidth={1} />
              <text x={PAD.left - 6} y={mapY(val, 0, iHi) + 3.5}
                textAnchor="end" fill="#64748b" fontSize={9}>{pct}</text>
            </g>
          );
        })}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={mapX(v, 0, 100)} y1={PAD.top + plotH}
              x2={mapX(v, 0, 100)} y2={PAD.top + plotH + 4} stroke="#475569" strokeWidth={1} />
            <text x={mapX(v, 0, 100)} y={PAD.top + plotH + 13}
              textAnchor="middle" fill="#64748b" fontSize={9}>{v}%</text>
          </g>
        ))}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize={11}>
          Light Intensity (%)
        </text>
        <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11}
          transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>
          Current (mA)
        </text>
        <path d={pathD} stroke="#34d399" strokeWidth={2.2} fill="none" />
        <circle cx={dotX} cy={dotY} r={5.5} fill="#fbbf24" stroke="#080c18" strokeWidth={1.5} />
      </svg>
    );
  }

  // Energy vs Frequency
  const fMin = SPEED_OF_LIGHT / (CONFIG.wavelength.max * 1e-9);
  const fMax = SPEED_OF_LIGHT / (CONFIG.wavelength.min * 1e-9);
  const keYLo = -8, keYHi = 5;
  const f0 = metal.workFunction / PLANCK_EV;
  const currentF = SPEED_OF_LIGHT / (wavelength * 1e-9);
  const zeroY = mapY(0, keYLo, keYHi);

  const pts: string[] = [];
  const steps = 150;
  for (let i = 0; i <= steps; i++) {
    const f = fMin + (i / steps) * (fMax - fMin);
    const ke = PLANCK_EV * f - metal.workFunction;
    if (ke >= keYLo && ke <= keYHi) {
      pts.push(`${mapX(f, fMin, fMax).toFixed(1)},${mapY(ke, keYLo, keYHi).toFixed(1)}`);
    }
  }
  const pathD = pts.length > 1 ? 'M' + pts.join(' L') : '';
  const dotKE = Math.max(keYLo, Math.min(keYHi, keMax));
  const dotX = mapX(currentF, fMin, fMax);
  const dotY = mapY(dotKE, keYLo, keYHi);

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Grid lines */}
      {[-6, -4, -2, 0, 2, 4].map(ke => (
        <line key={ke} x1={PAD.left} y1={mapY(ke, keYLo, keYHi)}
          x2={PAD.left + plotW} y2={mapY(ke, keYLo, keYHi)}
          stroke={ke === 0 ? '#334155' : '#1e293b'} strokeWidth={ke === 0 ? 1.2 : 1} />
      ))}
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH}
        stroke="#334155" strokeWidth={1.5} />
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW}
        y2={PAD.top + plotH} stroke="#334155" strokeWidth={1.5} />
      {/* Zero KE line */}
      <line x1={PAD.left} y1={zeroY} x2={PAD.left + plotW} y2={zeroY}
        stroke="#475569" strokeWidth={1} strokeDasharray="4,3" />
      {/* Y ticks */}
      {[-6, -4, -2, 0, 2, 4].map(ke => (
        <g key={ke}>
          <line x1={PAD.left - 4} y1={mapY(ke, keYLo, keYHi)}
            x2={PAD.left} y2={mapY(ke, keYLo, keYHi)} stroke="#475569" strokeWidth={1} />
          <text x={PAD.left - 6} y={mapY(ke, keYLo, keYHi) + 3.5}
            textAnchor="end" fill="#64748b" fontSize={9}>{ke}</text>
        </g>
      ))}
      {/* X ticks at round frequencies */}
      {[5, 7, 9, 11, 13, 15].map(fUnit => {
        const f = fUnit * 1e14;
        if (f < fMin || f > fMax) return null;
        return (
          <g key={fUnit}>
            <line x1={mapX(f, fMin, fMax)} y1={PAD.top + plotH}
              x2={mapX(f, fMin, fMax)} y2={PAD.top + plotH + 4} stroke="#475569" strokeWidth={1} />
            <text x={mapX(f, fMin, fMax)} y={PAD.top + plotH + 13}
              textAnchor="middle" fill="#64748b" fontSize={9}>{fUnit}</text>
          </g>
        );
      })}
      {/* Threshold frequency */}
      {f0 >= fMin && f0 <= fMax && (
        <g>
          <line x1={mapX(f0, fMin, fMax)} y1={PAD.top}
            x2={mapX(f0, fMin, fMax)} y2={PAD.top + plotH}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
          <text x={mapX(f0, fMin, fMax)} y={PAD.top - 4}
            textAnchor="middle" fill="#ef4444" fontSize={8}>f₀</text>
        </g>
      )}
      {/* Axis labels */}
      <text x={PAD.left + plotW / 2} y={H - 5} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        Frequency (×10¹⁴ Hz)
      </text>
      <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11}
        transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>
        KE<tspan fontSize={8} dy={3}>max</tspan><tspan dy={-3}> (eV)</tspan>
      </text>
      {/* Curve */}
      {pathD && <path d={pathD} stroke="#f472b6" strokeWidth={2.2} fill="none" />}
      {/* Work function annotation */}
      <text x={PAD.left + 6} y={mapY(-metal.workFunction, keYLo, keYHi) - 3}
        fill="#f97316" fontSize={8} opacity={0.8}>−φ = {(-metal.workFunction).toFixed(2)} eV</text>
      {/* Operating point */}
      <circle cx={dotX} cy={dotY} r={5.5} fill="#fbbf24" stroke="#080c18" strokeWidth={1.5} />
    </svg>
  );
}

// ================================================================
// SLIDER COMPONENT
// ================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: React.ReactNode;
  accentColor?: string;
}

function Slider({ label, value, min, max, step, onChange, display, accentColor = '#60a5fa' }: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="font-mono text-sm font-semibold text-slate-200">{display ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${((value - min) / (max - min)) * 100}%, #1e293b ${((value - min) / (max - min)) * 100}%, #1e293b 100%)`,
          accentColor,
        }}
      />
    </div>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function PhotoelectricSimulation() {
  const [wavelength, setWavelength]       = useState<number>(CONFIG.wavelength.default);
  const [intensity, setIntensity]         = useState<number>(CONFIG.intensity.default);
  const [voltage, setVoltage]             = useState<number>(CONFIG.voltage.default);
  const [metalKey, setMetalKey]           = useState<string>('sodium');
  const [showHighestOnly, setShowHighestOnly] = useState(false);
  const [activeGraph, setActiveGraph]     = useState<GraphType>('current-voltage');
  const [isPlaying, setIsPlaying]         = useState(true);

  // Refs for animation loop (avoids stale closures)
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const electronsRef   = useRef<ElectronParticle[]>([]);
  const animRef        = useRef<number>(0);
  const tickRef        = useRef(0);

  const wlRef          = useRef(wavelength);
  const intRef         = useRef(intensity);
  const vRef           = useRef(voltage);
  const metalKeyRef    = useRef(metalKey);
  const highestRef     = useRef(showHighestOnly);
  const playingRef     = useRef(isPlaying);

  useEffect(() => { wlRef.current = wavelength; },       [wavelength]);
  useEffect(() => { intRef.current = intensity; },        [intensity]);
  useEffect(() => { vRef.current = voltage; },            [voltage]);
  useEffect(() => { metalKeyRef.current = metalKey; },    [metalKey]);
  useEffect(() => { highestRef.current = showHighestOnly; }, [showHighestOnly]);
  useEffect(() => { playingRef.current = isPlaying; },    [isPlaying]);

  // Clear electrons when metal changes (avoids stale physics)
  useEffect(() => { electronsRef.current = []; }, [metalKey]);

  const metal = METALS[metalKey];
  const photonE = photonEnergyEV(wavelength);
  const keMax   = maxKineticEnergy(wavelength, metal.workFunction);
  const stopV   = stoppingVoltage(keMax);
  const current = calculateCurrent(keMax, voltage, intensity);

  // ── Animation loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cathodeRight = CONFIG.cathode.x + CONFIG.cathode.w;
    const gapWidth     = CONFIG.anode.x - cathodeRight;

    function tick() {
      tickRef.current++;

      if (!playingRef.current) {
        // Still draw (static frame) but don't spawn/move
        const m = METALS[metalKeyRef.current];
        const ke = maxKineticEnergy(wlRef.current, m.workFunction);
        drawFrame(ctx!, wlRef.current, intRef.current, vRef.current, m, electronsRef.current, ke, tickRef.current);
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const wl  = wlRef.current;
      const int = intRef.current;
      const v   = vRef.current;
      const m   = METALS[metalKeyRef.current];
      const ke  = maxKineticEnergy(wl, m.workFunction);

      // Spawn electrons — only when voltage hasn't exceeded the stopping voltage
      // (at -V_stop the most energetic electrons just barely stop; none can reach anode)
      const stopVoltage = Math.max(0, ke);
      const canEmit = ke > 0 && int > 0 && v >= -stopVoltage;
      if (canEmit && electronsRef.current.length < CONFIG.maxElectrons) {
        const prob = CONFIG.spawnRate * (int / 100);
        if (Math.random() < prob) {
          // Only spawn electrons whose individual energy can overcome the retarding field
          const baseEnergy = highestRef.current ? ke : Math.random() * ke;
          // Skip this electron if the field would stop it before it reaches the anode
          if (baseEnergy + v >= 0) {
            electronsRef.current.push({
              id:        eid++,
              x:         cathodeRight,
              y:         CONFIG.cathode.plateY + 15 + Math.random() * (CONFIG.cathode.plateH - 30),
              vx:        CONFIG.baseElectronSpeed,
              vy:        (Math.random() - 0.5) * 0.28,
              energy:    baseEnergy,
              alpha:     1,
              returning: false,
            });
          }
        }
      }

      // Update electrons
      electronsRef.current = electronsRef.current.filter(el => {
        if (el.returning) {
          el.x    -= CONFIG.baseElectronSpeed * 2.2;
          el.alpha = Math.max(0, el.alpha - 0.045);
          return el.alpha > 0 && el.x > CONFIG.cathode.x - 8;
        }

        // If the electron can never reach the anode at the current voltage, turn it back now.
        // This catches mid-flight electrons the moment voltage drops past -V_stop.
        if (el.energy + v < 0) {
          el.returning = true;
          return true;
        }

        const frac      = Math.max(0, (el.x - cathodeRight) / gapWidth);
        const currentKE = el.energy + v * frac;

        // Speed from kinetic energy (relativistic-ish visual feel)
        const maxKEPossible = Math.max(0.05, ke + Math.max(0, v));
        const speedFactor   = Math.sqrt(Math.max(0.06, currentKE) / maxKEPossible);
        el.vx = CONFIG.baseElectronSpeed * Math.max(0.25, speedFactor) * (1 + Math.abs(v) / 18);
        el.x += el.vx;
        el.y += el.vy;

        const { plateY: PY, plateH: PH } = CONFIG.cathode;
        if (el.y < PY + 8)        el.vy =  Math.abs(el.vy);
        if (el.y > PY + PH - 8)   el.vy = -Math.abs(el.vy);

        return el.x < CONFIG.anode.x;
      });

      drawFrame(ctx!, wl, int, v, m, electronsRef.current, ke, tickRef.current);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────
  const reset = useCallback(() => {
    setWavelength(CONFIG.wavelength.default);
    setIntensity(CONFIG.intensity.default);
    setVoltage(CONFIG.voltage.default);
    setMetalKey('sodium');
    setShowHighestOnly(false);
    electronsRef.current = [];
  }, []);

  const lightColor = wavelengthToCSS(wavelength);
  const spectrumPct = ((wavelength - CONFIG.wavelength.min) / (CONFIG.wavelength.max - CONFIG.wavelength.min)) * 100;

  const lightLabel =
    wavelength < 380 ? 'UV' :
    wavelength < 440 ? 'Violet' :
    wavelength < 490 ? 'Blue' :
    wavelength < 560 ? 'Green' :
    wavelength < 590 ? 'Yellow' :
    wavelength < 625 ? 'Orange' :
    wavelength <= 700 ? 'Red' : 'IR';

  const isEmitting = keMax > 0 && intensity > 0;
  const isStopped  = keMax > 0 && voltage < -stopV;

  // ── Render ──────────────────────────────────────────────────
  const voltageZeroPct = ((0 - CONFIG.voltage.min) / (CONFIG.voltage.max - CONFIG.voltage.min)) * 100;
  const voltageFillPct = ((voltage - CONFIG.voltage.min) / (CONFIG.voltage.max - CONFIG.voltage.min)) * 100;
  const voltageTrack = voltage >= 0
    ? `linear-gradient(to right, #1e293b ${voltageZeroPct}%, #fbbf24 ${voltageZeroPct}%, #fbbf24 ${voltageFillPct}%, #1e293b ${voltageFillPct}%)`
    : `linear-gradient(to right, #1e293b ${voltageFillPct}%, #ef4444 ${voltageFillPct}%, #ef4444 ${voltageZeroPct}%, #1e293b ${voltageZeroPct}%)`;

  const graphTabs: [GraphType, string, string][] = [
    ['current-voltage',   'I–V',    '#60a5fa'],
    ['current-intensity', 'I–Int',  '#34d399'],
    ['energy-frequency',  'KE–f',   '#f472b6'],
  ];

  return (
    <div className="h-screen bg-[#080c18] text-slate-200 flex flex-col overflow-hidden" style={{ fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800/70 bg-[#0a0f1e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-sm"
            style={{ background: `${lightColor}25`, border: `1px solid ${lightColor}50` }}>⚡</div>
          <h1 className="font-bold text-slate-100 text-sm tracking-wide">Photoelectric Effect</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 rounded px-2.5 py-1 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Current</span>
            <span className="font-mono font-bold text-xs" style={{ color: current > 0 ? '#4ade80' : '#475569' }}>
              {(current * 1000).toFixed(3)} mA
            </span>
          </div>
          <button onClick={() => setIsPlaying(p => !p)}
            className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
            style={{ background: isPlaying ? '#1e3a5f' : '#1a2b1a', borderColor: isPlaying ? '#3b82f6' : '#22c55e', color: isPlaying ? '#93c5fd' : '#86efac' }}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={reset}
            className="px-2.5 py-1 rounded text-xs font-medium border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all">
            Reset
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: canvas + controls ─────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 p-3 gap-2">

          {/* Controls row above canvas */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/60 px-3 py-2.5 grid grid-cols-[1fr_1fr_1fr] gap-x-4 gap-y-0 items-center shrink-0">

            {/* Wavelength */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 font-medium">Wavelength</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: lightColor, boxShadow: `0 0 5px ${lightColor}` }} />
                  <span className="font-mono text-[11px] font-bold text-slate-200">{wavelength} nm</span>
                  <span className="text-[10px] text-slate-500">{lightLabel}</span>
                </div>
              </div>
              {/* Spectrum bar — acts as the only slider via invisible overlay */}
              <div className="relative">
                <div className="h-5 rounded border border-slate-700/80 relative overflow-hidden"
                  style={{ background: 'linear-gradient(to right, #330088 0%, #5500BB 12%, #7700FF 22%, #4400FF 30%, #0000FF 38%, #0055FF 44%, #00AAFF 50%, #00FF99 56%, #44FF44 62%, #AAFF00 67%, #FFFF00 71%, #FFCC00 74%, #FF8800 77%, #FF4400 81%, #FF0000 86%, #CC0000 92%, #880000 100%)' }}>
                  <div className="absolute top-0 h-full w-px bg-white"
                    style={{ left: `${spectrumPct}%`, boxShadow: '0 0 4px white' }} />
                  <input type="range" min={CONFIG.wavelength.min} max={CONFIG.wavelength.max}
                    step={CONFIG.wavelength.step} value={wavelength}
                    onChange={e => setWavelength(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                  <span>200 nm</span><span>700 nm</span>
                </div>
              </div>
            </div>

            {/* Intensity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Intensity</span>
                <span className="font-mono text-[11px] font-bold text-yellow-400">{intensity}%</span>
              </div>
              <input type="range" min={CONFIG.intensity.min} max={CONFIG.intensity.max}
                step={CONFIG.intensity.step} value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #fbbf24 ${intensity}%, #1e293b ${intensity}%)`, accentColor: '#fbbf24' }} />
            </div>

            {/* Voltage */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Voltage</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${voltage > 0 ? 'bg-green-900/40 text-green-400' : voltage < 0 ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                    {voltage > 0 ? 'accel' : voltage < 0 ? 'decel' : 'off'}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-yellow-400">{voltage >= 0 ? '+' : ''}{voltage.toFixed(1)} V</span>
                </div>
              </div>
              <input type="range" min={CONFIG.voltage.min} max={CONFIG.voltage.max}
                step={CONFIG.voltage.step} value={voltage}
                onChange={e => setVoltage(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ background: voltageTrack, accentColor: voltage >= 0 ? '#fbbf24' : '#ef4444' }} />
              <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                <span>{CONFIG.voltage.min} V</span><span>0</span><span>+{CONFIG.voltage.max} V</span>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-lg border border-slate-800/60 overflow-hidden bg-[#080c18] flex-1 min-h-0" style={{ lineHeight: 0 }}>
            <canvas ref={canvasRef} width={CONFIG.canvas.w} height={CONFIG.canvas.h}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────── */}
        <div className="w-[300px] shrink-0 flex flex-col gap-2 p-3 pl-0 overflow-y-auto">

          {/* Metal selector */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/60 p-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Target Metal</div>
            <div className="relative">
              <select value={metalKey} onChange={e => setMetalKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer">
                {Object.entries(METALS).map(([k, m]) => (
                  <option key={k} value={k}>{m.name} ({m.symbol}) — φ = {m.workFunction} eV</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▾</div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(metal.workFunction / 7) * 100}%`, background: metal.color }} />
              </div>
              <span className="font-mono text-[10px] font-bold shrink-0" style={{ color: metal.color }}>φ = {metal.workFunction} eV</span>
            </div>
          </div>

          {/* Physics values */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/60 p-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Physics</div>
            <div className="space-y-1.5">
              {([
                ['Photon energy',   `${photonE.toFixed(3)} eV`,                                  '#60a5fa',  null],
                ['Work fn φ',       `${metal.workFunction.toFixed(2)} eV`,                        null,       metal.color],
                ['KE max',          keMax > 0 ? `${keMax.toFixed(3)} eV` : 'No emission',         keMax > 0 ? '#4ade80' : '#f87171', null],
                ['Stop voltage',    stopV > 0 ? `−${stopV.toFixed(2)} V` : '—',                   '#c084fc',  null],
                ['Threshold λ',     `${(HC_EV_NM / metal.workFunction).toFixed(0)} nm`,           '#fb923c',  null],
              ] as [string, string, string | null, string | null][]).map(([label, value, color, custom]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: custom ?? color ?? '#94a3b8' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className={`mt-2 px-2 py-1 rounded text-[10px] font-medium ${
              !isEmitting && intensity > 0 && keMax <= 0 ? 'bg-red-950/50 text-red-400 border border-red-900/40' :
              isEmitting && isStopped ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40' :
              isEmitting ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' :
              'bg-slate-800/50 text-slate-500 border border-slate-700/40'
            }`}>
              {!isEmitting && intensity > 0 && keMax <= 0 ? `E_photon < φ — no emission` :
               isEmitting && isStopped ? `|V| > V_stop — I = 0` :
               isEmitting ? 'Photoelectric effect active' :
               'Set intensity > 0'}
            </div>
          </div>

          {/* Checkbox */}
          <label className="bg-slate-900/50 rounded-lg border border-slate-800/60 px-2.5 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input type="checkbox" checked={showHighestOnly} onChange={e => setShowHighestOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer shrink-0" />
            <span className="text-[11px] text-slate-300">Highest energy electrons only</span>
          </label>

          {/* Graph */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/60 p-2.5 flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-2">
              {graphTabs.map(([g, label, col]) => (
                <button key={g} onClick={() => setActiveGraph(g)}
                  className="flex-1 text-[10px] py-1 rounded font-semibold transition-all"
                  style={{
                    background: activeGraph === g ? `${col}20` : 'transparent',
                    color: activeGraph === g ? col : '#64748b',
                    border: `1px solid ${activeGraph === g ? `${col}50` : '#1e293b'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Graph title + hint */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-500">
                {activeGraph === 'current-voltage' && stopV > 0 ? `V_stop = −${stopV.toFixed(2)} V` :
                 activeGraph === 'energy-frequency' ? `f₀ = ${(metal.workFunction / PLANCK_EV / 1e14).toFixed(1)}×10¹⁴ Hz` : ''}
              </span>
              <span className="text-[9px] text-yellow-600">● current state</span>
            </div>

            {/* SVG graph — fills remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Graph type={activeGraph} wavelength={wavelength} intensity={intensity}
                voltage={voltage} metal={metal} keMax={keMax} gw={272} gh={160} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
