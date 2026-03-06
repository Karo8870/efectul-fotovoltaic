'use client';

import { usePhotoelectricSim } from '@/hooks/usePhotoelectricSim';
import { PhotoelectricGraph } from '@/components/PhotoelectricGraph';
import { METALS, CONFIG } from '@/lib/photoelectric';

export default function Design2() {
  const sim = usePhotoelectricSim();
  
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2c2a] font-sans selection:bg-[#d6d3d1] selection:text-black">
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#e7e5e4] pb-8 mb-16 gap-8">
          <div>
            <h1 className="text-4xl tracking-tight text-[#1c1917]" style={{ fontFamily: 'Georgia, serif' }}>Photoelectric Observation</h1>
            <p className="text-[#a8a29e] mt-2 text-sm uppercase tracking-widest">Quantum Mechanics Laboratory</p>
          </div>
          <div className="flex items-center gap-6 text-sm w-full md:w-auto justify-between md:justify-end">
            <div className="text-left md:text-right">
              <span className="block text-[#a8a29e] uppercase tracking-widest text-xs mb-1">Current Output</span>
              <span className="font-mono text-lg text-[#44403c]">{(sim.current * 1000).toFixed(4)} mA</span>
            </div>
            <div className="h-8 w-px bg-[#e7e5e4] hidden md:block"></div>
            <button onClick={() => sim.setIsPlaying(!sim.isPlaying)} className="text-[#57534e] hover:text-black transition-colors uppercase tracking-widest text-xs">
              {sim.isPlaying ? 'Pause' : 'Resume'}
            </button>
            <button onClick={sim.reset} className="text-[#57534e] hover:text-black transition-colors uppercase tracking-widest text-xs">
              Reset
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 flex flex-col gap-16">
            {/* Visualizer */}
            <div className="rounded-2xl overflow-hidden bg-[#faf9f6] relative shadow-2xl shadow-black/5 border border-[#f5f5f4]" style={{ filter: 'invert(1) hue-rotate(180deg) contrast(0.95) brightness(1.05)' }}>
              <canvas ref={sim.canvasRef} width={CONFIG.canvas.w} height={CONFIG.canvas.h} className="w-full h-auto block" style={{ aspectRatio: `${CONFIG.canvas.w}/${CONFIG.canvas.h}` }} />
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs uppercase tracking-widest text-[#78716c]">Wavelength</label>
                  <span className="font-mono text-sm text-[#44403c]">{sim.wavelength} nm</span>
                </div>
                <input type="range" min={CONFIG.wavelength.min} max={CONFIG.wavelength.max} step={CONFIG.wavelength.step}
                  value={sim.wavelength} onChange={e => sim.setWavelength(Number(e.target.value))}
                  className="w-full h-0.5 bg-[#e7e5e4] appearance-none focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#44403c] cursor-pointer" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs uppercase tracking-widest text-[#78716c]">Intensity</label>
                  <span className="font-mono text-sm text-[#44403c]">{sim.intensity}%</span>
                </div>
                <input type="range" min={CONFIG.intensity.min} max={CONFIG.intensity.max} step={CONFIG.intensity.step}
                  value={sim.intensity} onChange={e => sim.setIntensity(Number(e.target.value))}
                  className="w-full h-0.5 bg-[#e7e5e4] appearance-none focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#44403c] cursor-pointer" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs uppercase tracking-widest text-[#78716c]">Voltage</label>
                  <span className="font-mono text-sm text-[#44403c]">{sim.voltage.toFixed(1)} V</span>
                </div>
                <input type="range" min={CONFIG.voltage.min} max={CONFIG.voltage.max} step={CONFIG.voltage.step}
                  value={sim.voltage} onChange={e => sim.setVoltage(Number(e.target.value))}
                  className="w-full h-0.5 bg-[#e7e5e4] appearance-none focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#44403c] cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-12">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#78716c] block mb-4">Target Material</label>
              <div className="relative">
                <select value={sim.metalKey} onChange={e => sim.setMetalKey(e.target.value)}
                  className="w-full bg-transparent border-b border-[#d6d3d1] pb-2 text-lg text-[#2c2c2a] focus:outline-none appearance-none cursor-pointer" style={{ fontFamily: 'Georgia, serif' }}>
                  {Object.entries(METALS).map(([k, m]) => (
                    <option key={k} value={k}>{m.name} — {m.workFunction} eV</option>
                  ))}
                </select>
                <div className="absolute right-0 top-2 pointer-events-none text-[#a8a29e]">↓</div>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-[#78716c] block mb-6">Metrics</label>
              <div className="space-y-4">
                {[
                  ['Incident Energy', `${sim.photonE.toFixed(2)} eV`],
                  ['Work Function', `${sim.metal.workFunction.toFixed(2)} eV`],
                  ['Kinetic Energy (Max)', sim.keMax > 0 ? `${sim.keMax.toFixed(2)} eV` : '0.00 eV'],
                  ['Stopping Potential', sim.stopV > 0 ? `-${sim.stopV.toFixed(2)} V` : '0.00 V']
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-baseline border-b border-[#f5f5f4] pb-2">
                    <span className="text-sm text-[#57534e]">{label}</span>
                    <span className="font-mono text-sm text-[#2c2c2a]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex flex-wrap gap-4 mb-6 border-b border-[#e7e5e4]">
                {(['current-voltage', 'current-intensity', 'energy-frequency'] as const).map(g => (
                  <button key={g} onClick={() => sim.setActiveGraph(g)}
                    className={`pb-2 text-xs uppercase tracking-widest transition-colors ${sim.activeGraph === g ? 'text-[#1c1917] border-b-2 border-[#1c1917]' : 'text-[#a8a29e] hover:text-[#57534e]'}`}>
                    {g.split('-').map(w => w[0].toUpperCase()).join(' / ')}
                  </button>
                ))}
              </div>
              <div className="h-[200px] flex justify-center items-center overflow-hidden">
                <PhotoelectricGraph type={sim.activeGraph} wavelength={sim.wavelength} intensity={sim.intensity}
                  voltage={sim.voltage} metal={sim.metal} keMax={sim.keMax} gw={300} gh={200}
                  axisColor="#d6d3d1" gridColor="#f5f5f4" labelColor="#a8a29e" tickColor="#d6d3d1" lineColor="#44403c" dotColor="#1c1917" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
