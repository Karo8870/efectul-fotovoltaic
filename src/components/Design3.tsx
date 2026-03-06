'use client';

import { usePhotoelectricSim } from '@/hooks/usePhotoelectricSim';
import { PhotoelectricGraph } from '@/components/PhotoelectricGraph';
import { METALS, CONFIG } from '@/lib/photoelectric';

export default function Design3() {
  const sim = usePhotoelectricSim();
  
  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] p-2 md:p-4 font-mono overflow-hidden relative selection:bg-[#00ff41] selection:text-black">
      {/* Scanlines effect */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-50 mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto border border-[#00ff41]/30 p-1 relative shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        {/* Corner markers */}
        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#00ff41]"></div>
        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#00ff41]"></div>
        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#00ff41]"></div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#00ff41]"></div>

        <header className="border-b border-[#00ff41]/30 p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#002200]/20 gap-4">
          <div className="flex gap-4 items-end">
            <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]">SYS.PHOTOELECTRIC</h1>
            <span className="text-xs text-[#00ff41]/60 mb-1 hidden sm:inline">V_2.4.1 [ONLINE]</span>
          </div>
          <div className="flex flex-wrap gap-6 md:gap-8 text-sm w-full md:w-auto justify-between">
            <div className="flex flex-col">
              <span className="text-[#00ff41]/60 text-[10px]">STATUS</span>
              <span className={sim.isEmitting ? 'animate-pulse' : 'opacity-50'}>{sim.isEmitting ? 'EMITTING' : 'IDLE'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#00ff41]/60 text-[10px]">I_OUT (mA)</span>
              <span>{(sim.current * 1000).toFixed(3)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => sim.setIsPlaying(!sim.isPlaying)} className="px-3 py-1 border border-[#00ff41]/50 hover:bg-[#00ff41]/20 transition-colors text-xs">
                {sim.isPlaying ? '[PAUSE]' : '[RESUME]'}
              </button>
              <button onClick={sim.reset} className="px-3 py-1 border border-[#00ff41]/50 hover:bg-[#00ff41]/20 transition-colors text-xs">
                [RST]
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 p-4 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="border border-[#00ff41]/30 p-4 bg-[#001100]/40">
              <h2 className="text-[#00ff41]/70 text-xs mb-4 border-b border-[#00ff41]/20 pb-1">TARGET_CONFIG</h2>
              <select value={sim.metalKey} onChange={e => sim.setMetalKey(e.target.value)}
                className="w-full bg-transparent border border-[#00ff41]/50 p-2 text-[#00ff41] focus:outline-none appearance-none hover:bg-[#00ff41]/10 cursor-pointer">
                {Object.entries(METALS).map(([k, m]) => (
                  <option key={k} value={k} className="bg-black">{m.name} [φ={m.workFunction}]</option>
                ))}
              </select>
            </div>

            <div className="border border-[#00ff41]/30 p-4 bg-[#001100]/40 flex-1">
              <h2 className="text-[#00ff41]/70 text-xs mb-4 border-b border-[#00ff41]/20 pb-1">TELEMETRY</h2>
              <div className="space-y-3 text-xs md:text-sm">
                <div><span className="text-[#00ff41]/50 inline-block w-12">E_PH:</span> {sim.photonE.toFixed(3)} eV</div>
                <div><span className="text-[#00ff41]/50 inline-block w-12">W_FN:</span> {sim.metal.workFunction.toFixed(2)} eV</div>
                <div><span className="text-[#00ff41]/50 inline-block w-12">K_MX:</span> {sim.keMax > 0 ? sim.keMax.toFixed(3) : 'ERR_LOW_E'} eV</div>
                <div><span className="text-[#00ff41]/50 inline-block w-12">V_SP:</span> {sim.stopV > 0 ? `-${sim.stopV.toFixed(2)}` : '0.00'} V</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="border border-[#00ff41]/50 bg-black relative flex items-center justify-center p-1 w-full" style={{ filter: 'grayscale(1) sepia(1) hue-rotate(60deg) contrast(1.5) brightness(1.2)' }}>
              <div className="absolute inset-0 border-[0.5px] border-[#00ff41]/20 pointer-events-none m-4"></div>
              <canvas ref={sim.canvasRef} width={CONFIG.canvas.w} height={CONFIG.canvas.h} className="w-full h-auto object-contain block" style={{ aspectRatio: `${CONFIG.canvas.w}/${CONFIG.canvas.h}` }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#00ff41]/30 p-4 bg-[#001100]/40 flex flex-col gap-4">
                <h2 className="text-[#00ff41]/70 text-xs mb-2 border-b border-[#00ff41]/20 pb-1">INPUT_MATRIX</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>WAVELENGTH</span><span>{sim.wavelength} nm</span>
                    </div>
                    <input type="range" min={CONFIG.wavelength.min} max={CONFIG.wavelength.max} step={CONFIG.wavelength.step}
                      value={sim.wavelength} onChange={e => sim.setWavelength(Number(e.target.value))}
                      className="w-full h-1 bg-[#00ff41]/30 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ff41] cursor-crosshair" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>INTENSITY</span><span>{sim.intensity}%</span>
                    </div>
                    <input type="range" min={CONFIG.intensity.min} max={CONFIG.intensity.max} step={CONFIG.intensity.step}
                      value={sim.intensity} onChange={e => sim.setIntensity(Number(e.target.value))}
                      className="w-full h-1 bg-[#00ff41]/30 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ff41] cursor-crosshair" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>VOLTAGE</span><span>{sim.voltage} V</span>
                    </div>
                    <input type="range" min={CONFIG.voltage.min} max={CONFIG.voltage.max} step={CONFIG.voltage.step}
                      value={sim.voltage} onChange={e => sim.setVoltage(Number(e.target.value))}
                      className="w-full h-1 bg-[#00ff41]/30 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ff41] cursor-crosshair" />
                  </div>
                </div>
              </div>

              <div className="border border-[#00ff41]/30 p-4 bg-[#001100]/40 flex flex-col">
                <div className="flex flex-wrap gap-2 border-b border-[#00ff41]/20 pb-2 mb-4">
                  {(['current-voltage', 'current-intensity', 'energy-frequency'] as const).map(g => (
                    <button key={g} onClick={() => sim.setActiveGraph(g)}
                      className={`text-[10px] px-2 py-1 border transition-colors ${sim.activeGraph === g ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'border-[#00ff41]/30 text-[#00ff41]/70 hover:bg-[#00ff41]/20'}`}>
                      [{g.toUpperCase()}]
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden flex items-center justify-center min-h-[150px]">
                  <PhotoelectricGraph type={sim.activeGraph} wavelength={sim.wavelength} intensity={sim.intensity}
                    voltage={sim.voltage} metal={sim.metal} keMax={sim.keMax} gw={300} gh={140}
                    axisColor="#00ff41" gridColor="#00ff4133" labelColor="#00ff41aa" tickColor="#00ff4166" lineColor="#00ff41" dotColor="#ffffff" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
