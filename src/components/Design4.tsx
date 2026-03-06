'use client';

import { usePhotoelectricSim } from '@/hooks/usePhotoelectricSim';
import { PhotoelectricGraph } from '@/components/PhotoelectricGraph';
import { METALS, CONFIG } from '@/lib/photoelectric';

export default function Design4() {
  const sim = usePhotoelectricSim();
  const spectrumTrack =
    'linear-gradient(90deg, #5b21b6 0%, #4338ca 14%, #2563eb 28%, #0891b2 42%, #10b981 56%, #facc15 72%, #f97316 86%, #ef4444 100%)';
  
  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#5c6b89] font-sans p-4 md:p-8 lg:p-12 transition-colors duration-1000" style={{ background: `radial-gradient(circle at top left, ${sim.lightColor}20, transparent 60%), #eef2f6` }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(163,177,198,0.2)] border border-white/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_8px_rgba(163,177,198,0.4)]" style={{ background: sim.lightColor, color: 'white' }}>
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#2d3748] tracking-tight">Photoelectric</h1>
              <p className="text-sm font-medium opacity-70">Interactive Simulation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-[#eef2f6] p-2 rounded-2xl shadow-[inset_0_2px_4px_rgba(163,177,198,0.3),inset_0_-2px_4px_rgba(255,255,255,0.8)] w-full md:w-auto justify-between">
            <div className="px-4 py-2 text-center border-r border-[#d1d8e0]">
              <span className="block text-[10px] uppercase font-bold text-[#8f9bb3]">Current</span>
              <span className="font-bold text-[#4a5568]">{(sim.current * 1000).toFixed(2)} mA</span>
            </div>
            <button onClick={() => sim.setIsPlaying(!sim.isPlaying)} className="w-10 h-10 rounded-xl bg-white shadow-[0_4px_8px_rgba(163,177,198,0.4)] flex items-center justify-center hover:scale-105 transition-transform text-[#4a5568]">
              {sim.isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={sim.reset} className="w-10 h-10 rounded-xl bg-white shadow-[0_4px_8px_rgba(163,177,198,0.4)] flex items-center justify-center hover:scale-105 transition-transform text-[#4a5568] mr-2">
              ↺
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Visuals */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_32px_rgba(163,177,198,0.2)] border border-white/60">
              <div className="rounded-2xl overflow-hidden bg-[#1e2336] shadow-inner" style={{ filter: 'contrast(0.95) brightness(1.15)' }}>
                <canvas ref={sim.canvasRef} width={CONFIG.canvas.w} height={CONFIG.canvas.h} className="w-full h-auto block rounded-2xl mix-blend-screen" style={{ aspectRatio: `${CONFIG.canvas.w}/${CONFIG.canvas.h}` }} />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {[
                {
                  label: 'Wavelength',
                  value: `${sim.wavelength} nm`,
                  min: CONFIG.wavelength.min,
                  max: CONFIG.wavelength.max,
                  step: CONFIG.wavelength.step,
                  val: sim.wavelength,
                  setter: sim.setWavelength,
                  color: sim.lightColor,
                  background: spectrumTrack,
                },
                { label: 'Intensity', value: `${sim.intensity}%`, min: CONFIG.intensity.min, max: CONFIG.intensity.max, step: CONFIG.intensity.step, val: sim.intensity, setter: sim.setIntensity, color: '#fbbf24' },
                { label: 'Voltage', value: `${sim.voltage} V`, min: CONFIG.voltage.min, max: CONFIG.voltage.max, step: CONFIG.voltage.step, val: sim.voltage, setter: sim.setVoltage, color: sim.voltage >= 0 ? '#4ade80' : '#f87171' },
              ].map(ctrl => (
                <div key={ctrl.label} className="bg-[#eef2f6] p-6 rounded-3xl shadow-[8px_8px_16px_rgba(163,177,198,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4a5568] text-sm">{ctrl.label}</span>
                    <span className="text-xs font-black px-2 py-1 rounded-lg bg-white shadow-[0_2px_4px_rgba(163,177,198,0.2)]">{ctrl.value}</span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val} onChange={e => ctrl.setter(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none shadow-[inset_0_2px_4px_rgba(163,177,198,0.5)] bg-[#d1d8e0] cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                    style={{
                      background:
                        ctrl.label === 'Wavelength'
                          ? ctrl.background
                          : `linear-gradient(to right, ${ctrl.color} ${((ctrl.val - ctrl.min) / (ctrl.max - ctrl.min)) * 100}%, #d1d8e0 ${((ctrl.val - ctrl.min) / (ctrl.max - ctrl.min)) * 100}%)`,
                    }} />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(163,177,198,0.2)] border border-white/60">
              <h2 className="font-bold text-[#4a5568] mb-4">Material Target</h2>
              <div className="relative">
                <select value={sim.metalKey} onChange={e => sim.setMetalKey(e.target.value)}
                  className="w-full bg-[#eef2f6] shadow-[inset_0_2px_4px_rgba(163,177,198,0.3)] rounded-xl p-4 text-[#4a5568] font-bold focus:outline-none appearance-none cursor-pointer">
                  {Object.entries(METALS).map(([k, m]) => (
                    <option key={k} value={k}>{m.name} (φ = {m.workFunction} eV)</option>
                  ))}
                </select>
                <div className="absolute right-4 top-[18px] pointer-events-none opacity-50">▼</div>
              </div>
              
              <div className="mt-6 space-y-3">
                {[
                  ['Photon Energy', `${sim.photonE.toFixed(2)} eV`],
                  ['Work Function', `${sim.metal.workFunction.toFixed(2)} eV`],
                  ['Max Kinetic E.', sim.keMax > 0 ? `${sim.keMax.toFixed(2)} eV` : '0.00 eV'],
                  ['Stop Voltage', sim.stopV > 0 ? `-${sim.stopV.toFixed(2)} V` : '0.00 V']
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center p-3 rounded-xl bg-white shadow-[0_2px_8px_rgba(163,177,198,0.15)]">
                    <span className="text-xs font-bold text-[#8f9bb3]">{label}</span>
                    <span className="text-sm font-black text-[#4a5568]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(163,177,198,0.2)] border border-white/60 flex-1 flex flex-col">
              <div className="flex gap-2 mb-4 bg-[#eef2f6] p-1.5 rounded-2xl shadow-[inset_0_2px_4px_rgba(163,177,198,0.3)]">
                {(['current-voltage', 'current-intensity', 'energy-frequency'] as const).map(g => (
                  <button key={g} onClick={() => sim.setActiveGraph(g)}
                    className={`flex-1 text-[10px] font-bold py-2 rounded-xl transition-all ${sim.activeGraph === g ? 'bg-white text-[#4a5568] shadow-[0_2px_4px_rgba(163,177,198,0.3)]' : 'text-[#8f9bb3] hover:text-[#4a5568]'}`}>
                    {g === 'current-voltage' ? 'I-V' : g === 'current-intensity' ? 'I-Int' : 'E-Freq'}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center justify-center rounded-2xl bg-white/50 p-2 shadow-[inset_0_2px_8px_rgba(163,177,198,0.1)] min-h-[160px] overflow-hidden">
                <PhotoelectricGraph type={sim.activeGraph} wavelength={sim.wavelength} intensity={sim.intensity}
                  voltage={sim.voltage} metal={sim.metal} keMax={sim.keMax} gw={300} gh={200}
                  axisColor="#a0aec0" gridColor="#e2e8f0" labelColor="#718096" tickColor="#cbd5e0" lineColor="#8b5cf6" dotColor="#ec4899" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
