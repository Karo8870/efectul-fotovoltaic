'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  METALS, CONFIG, Metal, GraphType,
  maxKineticEnergy, stoppingVoltage, calculateCurrent,
  wavelengthToCSS, getLightLabel, photonEnergyEV,
} from '@/lib/photoelectric';
import { drawFrame, ElectronParticle } from '@/lib/photoelectric-canvas';

let eid = 0;

export function usePhotoelectricSim() {
  const [wavelength, setWavelength]           = useState<number>(CONFIG.wavelength.default);
  const [intensity, setIntensity]             = useState<number>(CONFIG.intensity.default);
  const [voltage, setVoltage]                 = useState<number>(CONFIG.voltage.default);
  const [metalKey, setMetalKey]               = useState<string>('sodium');
  const [showHighestOnly, setShowHighestOnly] = useState(false);
  const [activeGraph, setActiveGraph]         = useState<GraphType>('current-voltage');
  const [isPlaying, setIsPlaying]             = useState(true);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const electronsRef = useRef<ElectronParticle[]>([]);
  const animRef      = useRef<number>(0);
  const tickRef      = useRef(0);

  const wlRef       = useRef(wavelength);
  const intRef      = useRef(intensity);
  const vRef        = useRef(voltage);
  const metalKeyRef = useRef(metalKey);
  const highestRef  = useRef(showHighestOnly);
  const playingRef  = useRef(isPlaying);

  useEffect(() => { wlRef.current = wavelength; },           [wavelength]);
  useEffect(() => { intRef.current = intensity; },            [intensity]);
  useEffect(() => { vRef.current = voltage; },                [voltage]);
  useEffect(() => { metalKeyRef.current = metalKey; },        [metalKey]);
  useEffect(() => { highestRef.current = showHighestOnly; },  [showHighestOnly]);
  useEffect(() => { playingRef.current = isPlaying; },        [isPlaying]);
  useEffect(() => { electronsRef.current = []; },             [metalKey]);

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
        const m  = METALS[metalKeyRef.current];
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

      const stopVoltage = Math.max(0, ke);
      const canEmit = ke > 0 && int > 0 && v >= -stopVoltage;
      if (canEmit && electronsRef.current.length < CONFIG.maxElectrons) {
        const prob = CONFIG.spawnRate * (int / 100);
        if (Math.random() < prob) {
          const baseEnergy = highestRef.current ? ke : Math.random() * ke;
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

      electronsRef.current = electronsRef.current.filter(el => {
        if (el.returning) {
          el.x    -= CONFIG.baseElectronSpeed * 2.2;
          el.alpha = Math.max(0, el.alpha - 0.045);
          return el.alpha > 0 && el.x > CONFIG.cathode.x - 8;
        }
        if (el.energy + v < 0) {
          el.returning = true;
          return true;
        }
        const frac      = Math.max(0, (el.x - cathodeRight) / gapWidth);
        const currentKE = el.energy + v * frac;
        const maxKEPossible = Math.max(0.05, ke + Math.max(0, v));
        const speedFactor   = Math.sqrt(Math.max(0.06, currentKE) / maxKEPossible);
        el.vx = CONFIG.baseElectronSpeed * Math.max(0.25, speedFactor) * (1 + Math.abs(v) / 18);
        el.x += el.vx;
        el.y += el.vy;
        const { plateY: PY, plateH: PH } = CONFIG.cathode;
        if (el.y < PY + 8)      el.vy =  Math.abs(el.vy);
        if (el.y > PY + PH - 8) el.vy = -Math.abs(el.vy);
        return el.x < CONFIG.anode.x;
      });

      drawFrame(ctx!, wl, int, v, m, electronsRef.current, ke, tickRef.current);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const reset = useCallback(() => {
    setWavelength(CONFIG.wavelength.default);
    setIntensity(CONFIG.intensity.default);
    setVoltage(CONFIG.voltage.default);
    setMetalKey('sodium');
    setShowHighestOnly(false);
    electronsRef.current = [];
  }, []);

  const metal    = METALS[metalKey];
  const photonE  = photonEnergyEV(wavelength);
  const keMax    = maxKineticEnergy(wavelength, metal.workFunction);
  const stopV    = stoppingVoltage(keMax);
  const current  = calculateCurrent(keMax, voltage, intensity);
  const lightColor  = wavelengthToCSS(wavelength);
  const lightLabel  = getLightLabel(wavelength);
  const spectrumPct = ((wavelength - CONFIG.wavelength.min) / (CONFIG.wavelength.max - CONFIG.wavelength.min)) * 100;
  const isEmitting  = keMax > 0 && intensity > 0;
  const isStopped   = keMax > 0 && voltage < -stopV;

  const voltageZeroPct = ((0 - CONFIG.voltage.min) / (CONFIG.voltage.max - CONFIG.voltage.min)) * 100;
  const voltageFillPct = ((voltage - CONFIG.voltage.min) / (CONFIG.voltage.max - CONFIG.voltage.min)) * 100;
  const voltageTrack = voltage >= 0
    ? `linear-gradient(to right, #1e293b ${voltageZeroPct}%, #fbbf24 ${voltageZeroPct}%, #fbbf24 ${voltageFillPct}%, #1e293b ${voltageFillPct}%)`
    : `linear-gradient(to right, #1e293b ${voltageFillPct}%, #ef4444 ${voltageFillPct}%, #ef4444 ${voltageZeroPct}%, #1e293b ${voltageZeroPct}%)`;

  return {
    wavelength, setWavelength,
    intensity, setIntensity,
    voltage, setVoltage,
    metalKey, setMetalKey,
    showHighestOnly, setShowHighestOnly,
    activeGraph, setActiveGraph,
    isPlaying, setIsPlaying,
    canvasRef,
    metal,
    photonE,
    keMax,
    stopV,
    current,
    lightColor,
    lightLabel,
    spectrumPct,
    isEmitting,
    isStopped,
    reset,
    voltageTrack,
    voltageZeroPct,
    voltageFillPct,
  };
}
