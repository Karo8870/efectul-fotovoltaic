'use client';

import React from 'react';
import {
  CONFIG, Metal, GraphType,
  PLANCK_EV, SPEED_OF_LIGHT, HC_EV_NM,
  stoppingVoltage, calculateCurrent,
} from '@/lib/photoelectric';

export interface GraphProps {
  type: GraphType;
  wavelength: number;
  intensity: number;
  voltage: number;
  metal: Metal;
  keMax: number;
  gw?: number;
  gh?: number;
  lineColor?: string;
  dotColor?: string;
  gridColor?: string;
  axisColor?: string;
  labelColor?: string;
  tickColor?: string;
}

export function PhotoelectricGraph({
  type, wavelength, intensity, voltage, metal, keMax,
  gw = 400, gh = 190,
  lineColor,
  dotColor = '#fbbf24',
  gridColor = '#1e293b',
  axisColor = '#334155',
  labelColor = '#94a3b8',
  tickColor = '#64748b',
}: GraphProps) {
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
    const curve = lineColor ?? '#60a5fa';
    const vLo = CONFIG.voltage.min, vHi = CONFIG.voltage.max;
    const iHi = CONFIG.maxCurrentA;

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
        {[0, 0.025, 0.05, 0.075, 0.1].map(v => (
          <line key={v} x1={PAD.left} y1={mapY(v, 0, iHi)} x2={PAD.left + plotW}
            y2={mapY(v, 0, iHi)} stroke={gridColor} strokeWidth={1} />
        ))}
        {[-10, -5, 0, 5, 10].map(v => (
          <line key={v} x1={mapX(v, vLo, vHi)} y1={PAD.top}
            x2={mapX(v, vLo, vHi)} y2={PAD.top + plotH} stroke={gridColor} strokeWidth={1} />
        ))}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
        <line x1={mapX(0, vLo, vHi)} y1={PAD.top} x2={mapX(0, vLo, vHi)} y2={PAD.top + plotH}
          stroke={axisColor} strokeWidth={1} strokeDasharray="3,3" />
        {[0, 25, 50, 75, 100].map(pct => {
          const val = pct / 1000;
          return (
            <g key={pct}>
              <line x1={PAD.left - 4} y1={mapY(val, 0, iHi)} x2={PAD.left} y2={mapY(val, 0, iHi)} stroke={tickColor} strokeWidth={1} />
              <text x={PAD.left - 6} y={mapY(val, 0, iHi) + 3.5} textAnchor="end" fill={tickColor} fontSize={9}>{pct}</text>
            </g>
          );
        })}
        {[-10, -5, 0, 5, 10].map(v => (
          <g key={v}>
            <line x1={mapX(v, vLo, vHi)} y1={PAD.top + plotH} x2={mapX(v, vLo, vHi)} y2={PAD.top + plotH + 4} stroke={tickColor} strokeWidth={1} />
            <text x={mapX(v, vLo, vHi)} y={PAD.top + plotH + 13} textAnchor="middle" fill={tickColor} fontSize={9}>{v}</text>
          </g>
        ))}
        {stopV > 0 && (
          <g>
            <line x1={mapX(-stopV, vLo, vHi)} y1={PAD.top} x2={mapX(-stopV, vLo, vHi)} y2={PAD.top + plotH}
              stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
            <text x={mapX(-stopV, vLo, vHi)} y={PAD.top - 4} textAnchor="middle" fill="#ef4444" fontSize={8}>
              −V<tspan fontSize={6} dy={2}>stop</tspan>
            </text>
          </g>
        )}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill={labelColor} fontSize={11}>Tensiune (V)</text>
        <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill={labelColor} fontSize={11}
          transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>Curent (mA)</text>
        <path d={pathD} stroke={curve} strokeWidth={2.2} fill="none" />
        <circle cx={dotX} cy={dotY} r={5.5} fill={dotColor} stroke="#080c18" strokeWidth={1.5} />
      </svg>
    );
  }

  if (type === 'current-intensity') {
    const curve = lineColor ?? '#34d399';
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
            y2={mapY(v, 0, iHi)} stroke={gridColor} strokeWidth={1} />
        ))}
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={mapX(v, 0, 100)} y1={PAD.top}
            x2={mapX(v, 0, 100)} y2={PAD.top + plotH} stroke={gridColor} strokeWidth={1} />
        ))}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
        {[0, 25, 50, 75, 100].map(pct => {
          const val = pct / 1000;
          return (
            <g key={pct}>
              <line x1={PAD.left - 4} y1={mapY(val, 0, iHi)} x2={PAD.left} y2={mapY(val, 0, iHi)} stroke={tickColor} strokeWidth={1} />
              <text x={PAD.left - 6} y={mapY(val, 0, iHi) + 3.5} textAnchor="end" fill={tickColor} fontSize={9}>{pct}</text>
            </g>
          );
        })}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={mapX(v, 0, 100)} y1={PAD.top + plotH} x2={mapX(v, 0, 100)} y2={PAD.top + plotH + 4} stroke={tickColor} strokeWidth={1} />
            <text x={mapX(v, 0, 100)} y={PAD.top + plotH + 13} textAnchor="middle" fill={tickColor} fontSize={9}>{v}%</text>
          </g>
        ))}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill={labelColor} fontSize={11}>Intensitate (%)</text>
        <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill={labelColor} fontSize={11}
          transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>Curent (mA)</text>
        <path d={pathD} stroke={curve} strokeWidth={2.2} fill="none" />
        <circle cx={dotX} cy={dotY} r={5.5} fill={dotColor} stroke="#080c18" strokeWidth={1.5} />
      </svg>
    );
  }

  // Energy vs Frequency
  const curve = lineColor ?? '#f472b6';
  const fMin = SPEED_OF_LIGHT / (CONFIG.wavelength.max * 1e-9);
  const fMax = SPEED_OF_LIGHT / (CONFIG.wavelength.min * 1e-9);
  const keYLo = -8, keYHi = 5;
  const f0 = metal.workFunction / PLANCK_EV;
  const currentF = SPEED_OF_LIGHT / (wavelength * 1e-9);
  const zeroY = mapY(0, keYLo, keYHi);

  const pts: string[] = [];
  for (let i = 0; i <= 150; i++) {
    const f = fMin + (i / 150) * (fMax - fMin);
    const ke = PLANCK_EV * f - metal.workFunction;
    if (ke >= keYLo && ke <= keYHi) {
      pts.push(`${mapX(f, fMin, fMax).toFixed(1)},${mapY(ke, keYLo, keYHi).toFixed(1)}`);
    }
  }
  const pathD = pts.length > 1 ? 'M' + pts.join(' L') : '';
  const dotKE = Math.max(keYLo, Math.min(keYHi, keMax));
  const dotX  = mapX(currentF, fMin, fMax);
  const dotY  = mapY(dotKE, keYLo, keYHi);

  return (
    <svg width={W} height={H} className="overflow-visible">
      {[-6, -4, -2, 0, 2, 4].map(ke => (
        <line key={ke} x1={PAD.left} y1={mapY(ke, keYLo, keYHi)}
          x2={PAD.left + plotW} y2={mapY(ke, keYLo, keYHi)}
          stroke={ke === 0 ? axisColor : gridColor} strokeWidth={ke === 0 ? 1.2 : 1} />
      ))}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1.5} />
      <line x1={PAD.left} y1={zeroY} x2={PAD.left + plotW} y2={zeroY}
        stroke={tickColor} strokeWidth={1} strokeDasharray="4,3" />
      {[-6, -4, -2, 0, 2, 4].map(ke => (
        <g key={ke}>
          <line x1={PAD.left - 4} y1={mapY(ke, keYLo, keYHi)} x2={PAD.left} y2={mapY(ke, keYLo, keYHi)} stroke={tickColor} strokeWidth={1} />
          <text x={PAD.left - 6} y={mapY(ke, keYLo, keYHi) + 3.5} textAnchor="end" fill={tickColor} fontSize={9}>{ke}</text>
        </g>
      ))}
      {[5, 7, 9, 11, 13, 15].map(fUnit => {
        const f = fUnit * 1e14;
        if (f < fMin || f > fMax) return null;
        return (
          <g key={fUnit}>
            <line x1={mapX(f, fMin, fMax)} y1={PAD.top + plotH} x2={mapX(f, fMin, fMax)} y2={PAD.top + plotH + 4} stroke={tickColor} strokeWidth={1} />
            <text x={mapX(f, fMin, fMax)} y={PAD.top + plotH + 13} textAnchor="middle" fill={tickColor} fontSize={9}>{fUnit}</text>
          </g>
        );
      })}
      {f0 >= fMin && f0 <= fMax && (
        <g>
          <line x1={mapX(f0, fMin, fMax)} y1={PAD.top} x2={mapX(f0, fMin, fMax)} y2={PAD.top + plotH}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
          <text x={mapX(f0, fMin, fMax)} y={PAD.top - 4} textAnchor="middle" fill="#ef4444" fontSize={8}>f₀</text>
        </g>
      )}
      <text x={PAD.left + plotW / 2} y={H - 5} textAnchor="middle" fill={labelColor} fontSize={11}>
        Frecvență (×10¹⁴ Hz)
      </text>
      <text x={13} y={PAD.top + plotH / 2} textAnchor="middle" fill={labelColor} fontSize={11}
        transform={`rotate(-90,13,${PAD.top + plotH / 2})`}>
        KE<tspan fontSize={8} dy={3}>max</tspan><tspan dy={-3}> (eV)</tspan>
      </text>
      {pathD && <path d={pathD} stroke={curve} strokeWidth={2.2} fill="none" />}
      <text x={PAD.left + 6} y={mapY(-metal.workFunction, keYLo, keYHi) - 3}
        fill="#f97316" fontSize={8} opacity={0.8}>−φ = {(-metal.workFunction).toFixed(2)} eV</text>
      <circle cx={dotX} cy={dotY} r={5.5} fill={dotColor} stroke="#080c18" strokeWidth={1.5} />
    </svg>
  );
}
