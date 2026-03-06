'use client';

import { usePhotoelectricSim } from '@/hooks/usePhotoelectricSim';
import { PhotoelectricGraph } from '@/components/PhotoelectricGraph';
import { METALS, CONFIG } from '@/lib/photoelectric';

export default function Design1() {
  const sim = usePhotoelectricSim();
  
  return (
    <div className="min-h-screen bg-yellow-400 text-black p-4 md:p-8 font-mono uppercase selection:bg-black selection:text-white" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
      <header className="border-8 border-black p-4 md:p-6 bg-white mb-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-red-600">PHOTOELECTRIC<br/>EFFECT</h1>
        <div className="flex flex-wrap gap-4 items-center font-bold text-lg md:text-xl">
          <div className="border-4 border-black px-4 py-2 bg-blue-400">
            CURRENT: <span className="text-white bg-black px-2 py-1 ml-2">{(sim.current * 1000).toFixed(3)} mA</span>
          </div>
          <button onClick={() => sim.setIsPlaying(!sim.isPlaying)} className="border-4 border-black px-6 py-2 bg-green-400 hover:bg-black hover:text-green-400 transition-colors">
            {sim.isPlaying ? 'HALT' : 'IGNITE'}
          </button>
          <button onClick={sim.reset} className="border-4 border-black px-6 py-2 bg-red-400 hover:bg-black hover:text-red-400 transition-colors">
            PURGE
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 flex flex-col gap-8">
          {/* Controls */}
          <div className="border-8 border-black bg-[#ff90e8] p-4 md:p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)] flex flex-col gap-6">
            <h2 className="text-2xl md:text-3xl font-black border-b-4 border-black pb-2">PARAMETERS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-lg md:text-xl">WAVELENGTH: {sim.wavelength}nm</label>
                <input type="range" min={CONFIG.wavelength.min} max={CONFIG.wavelength.max} step={CONFIG.wavelength.step}
                  value={sim.wavelength} onChange={e => sim.setWavelength(Number(e.target.value))}
                  className="w-full h-8 bg-black appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-lg md:text-xl">INTENSITY: {sim.intensity}%</label>
                <input type="range" min={CONFIG.intensity.min} max={CONFIG.intensity.max} step={CONFIG.intensity.step}
                  value={sim.intensity} onChange={e => sim.setIntensity(Number(e.target.value))}
                  className="w-full h-8 bg-black appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-lg md:text-xl">VOLTAGE: {sim.voltage}V</label>
                <input type="range" min={CONFIG.voltage.min} max={CONFIG.voltage.max} step={CONFIG.voltage.step}
                  value={sim.voltage} onChange={e => sim.setVoltage(Number(e.target.value))}
                  className="w-full h-8 bg-black appearance-none cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="border-8 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-black text-white px-4 py-2 font-bold text-lg md:text-xl border-b-8 border-black flex justify-between">
              <span>SIMULATION_VIEWPORT</span>
              <span style={{ color: sim.lightColor }}>{sim.lightLabel}</span>
            </div>
            <div className="bg-[#080c18] w-full" style={{ filter: 'contrast(150%) saturate(200%)' }}>
              <canvas ref={sim.canvasRef} width={CONFIG.canvas.w} height={CONFIG.canvas.h}
                className="w-full h-auto block" style={{ aspectRatio: `${CONFIG.canvas.w}/${CONFIG.canvas.h}` }} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-8">
          <div className="border-8 border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-2xl md:text-3xl font-black mb-4">TARGET_METAL</h2>
            <select value={sim.metalKey} onChange={e => sim.setMetalKey(e.target.value)}
              className="w-full border-4 border-black p-4 text-lg md:text-xl font-bold bg-yellow-200 cursor-pointer focus:outline-none appearance-none hover:bg-yellow-300">
              {Object.entries(METALS).map(([k, m]) => (
                <option key={k} value={k}>{m.name.toUpperCase()} (φ={m.workFunction}eV)</option>
              ))}
            </select>
          </div>

          <div className="border-8 border-black bg-[#4ade80] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-2xl md:text-3xl font-black mb-4">DATA_OUTPUT</h2>
            <div className="flex flex-col gap-4 text-lg md:text-xl font-bold">
              <div className="flex justify-between border-b-4 border-black pb-2">
                <span>PHOTON_E</span>
                <span>{sim.photonE.toFixed(3)} eV</span>
              </div>
              <div className="flex justify-between border-b-4 border-black pb-2">
                <span>WORK_FUNC</span>
                <span>{sim.metal.workFunction.toFixed(2)} eV</span>
              </div>
              <div className="flex justify-between border-b-4 border-black pb-2">
                <span>KE_MAX</span>
                <span>{sim.keMax > 0 ? sim.keMax.toFixed(3) : 'NONE'} eV</span>
              </div>
              <div className="flex justify-between border-b-4 border-black pb-2">
                <span>V_STOP</span>
                <span>{sim.stopV > 0 ? `-${sim.stopV.toFixed(2)}` : '0.00'} V</span>
              </div>
            </div>
          </div>

          <div className="border-8 border-black bg-white p-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)] flex-1 min-h-[300px] flex flex-col">
            <div className="flex flex-wrap gap-2 mb-4">
              {(['current-voltage', 'current-intensity', 'energy-frequency'] as const).map(g => (
                <button key={g} onClick={() => sim.setActiveGraph(g)}
                  className={`flex-1 border-4 border-black font-bold p-2 text-sm ${sim.activeGraph === g ? 'bg-black text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
                  {g.split('-')[1].toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 bg-black pt-4 px-2 flex justify-center items-center overflow-hidden">
              <PhotoelectricGraph type={sim.activeGraph} wavelength={sim.wavelength} intensity={sim.intensity}
                voltage={sim.voltage} metal={sim.metal} keMax={sim.keMax} gw={300} gh={200}
                axisColor="#ffffff" gridColor="#333333" labelColor="#ffffff" tickColor="#aaaaaa" lineColor="#ffff00" dotColor="#ff0000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
