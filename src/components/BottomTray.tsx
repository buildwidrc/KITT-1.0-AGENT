import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Gauge,
  Terminal,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Sliders,
  Zap,
} from 'lucide-react';
import { CircuitComponent, SimulationMeasurement } from '../types';

interface BottomTrayProps {
  simulation: SimulationMeasurement | null;
  isSimulating: boolean;
  components: CircuitComponent[];
  serialLogs: string[];
}

export const BottomTray: React.FC<BottomTrayProps> = ({
  simulation,
  isSimulating,
  components,
  serialLogs,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'scope' | 'meter' | 'serial'>('scope');

  // Oscilloscope Canvas Ref & Buffers
  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformBufferCh1 = useRef<number[]>([]);
  const waveformBufferCh2 = useRef<number[]>([]);
  const [timeDivMs, setTimeDivMs] = useState(100);
  const [isScopePaused, setIsScopePaused] = useState(false);

  // Multimeter Probe Selection
  const [meterProbePin, setMeterProbePin] = useState<string>('all');
  const [meterMode, setMeterMode] = useState<'V' | 'mA' | 'Ω'>('V');

  // Waveform sampling loop
  useEffect(() => {
    if (!simulation || isScopePaused) return;

    const ch1 = simulation.channel1Voltage || 0;
    const ch2 = simulation.channel2Voltage || 0;

    waveformBufferCh1.current.push(ch1);
    waveformBufferCh2.current.push(ch2);

    if (waveformBufferCh1.current.length > 200) waveformBufferCh1.current.shift();
    if (waveformBufferCh2.current.length > 200) waveformBufferCh2.current.shift();

    // Render on canvas
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#0a0d13';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 1;
    const xStep = w / 10;
    const yStep = h / 8;
    for (let x = 0; x <= w; x += xStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += yStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero Reference Center Line
    ctx.strokeStyle = '#2d3b55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    // Draw CH1 Waveform (Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const buf1 = waveformBufferCh1.current;
    buf1.forEach((val, i) => {
      const x = (i / 200) * w;
      // 5V full scale maps to height
      const y = h * 0.75 - (val / 5.5) * (h * 0.6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw CH2 Waveform (Magenta)
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    const buf2 = waveformBufferCh2.current;
    buf2.forEach((val, i) => {
      const x = (i / 200) * w;
      const y = h * 0.75 - (val / 5.5) * (h * 0.6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [simulation, isScopePaused]);

  // Multimeter reading calculation
  let meterReading = 0;
  let meterUnit = 'V';
  if (simulation) {
    if (meterMode === 'V') {
      meterReading = simulation.channel1Voltage;
      meterUnit = 'V';
    } else if (meterMode === 'mA') {
      meterReading = simulation.totalCurrentMa;
      meterUnit = 'mA';
    } else {
      meterReading = 220;
      meterUnit = 'Ω';
    }
  }

  return (
    <footer
      className={`bg-[#0d1017] border-t border-[#232936] transition-all flex flex-col shrink-0 select-none z-20 ${
        isOpen ? 'h-52' : 'h-8'
      }`}
    >
      {/* Header bar / Tab toggle */}
      <div className="h-8 px-3 bg-[#0a0c10] flex items-center justify-between border-b border-[#232936]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span className="font-bold">INSTRUMENTS</span>
          </button>

          {isOpen && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('scope')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                  activeTab === 'scope'
                    ? 'bg-[#1f2737] text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Oscilloscope</span>
              </button>

              <button
                onClick={() => setActiveTab('meter')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                  activeTab === 'meter'
                    ? 'bg-[#1f2737] text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Multimeter</span>
              </button>

              <button
                onClick={() => setActiveTab('serial')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                  activeTab === 'serial'
                    ? 'bg-[#1f2737] text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Serial Monitor</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Telemetry Chips */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">VCC RAIL:</span>
            <span className="text-emerald-400 font-bold">5.02 V</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">CURRENT:</span>
            <span className="text-cyan-400 font-bold">{simulation?.totalCurrentMa || 0} mA</span>
          </div>
        </div>
      </div>

      {/* Main Drawer Panels */}
      {isOpen && (
        <div className="flex-1 overflow-hidden p-2.5">
          {/* TAB 1: OSCILLOSCOPE */}
          {activeTab === 'scope' && (
            <div className="h-full flex items-center gap-4">
              {/* Scope Display Screen */}
              <div className="flex-1 h-full bg-[#07090e] rounded-lg border border-[#232c3d] p-1.5 relative overflow-hidden flex flex-col">
                <canvas
                  ref={scopeCanvasRef}
                  width={600}
                  height={150}
                  className="w-full h-full rounded"
                />

                {/* On-screen channel legends */}
                <div className="absolute top-3 left-4 flex items-center gap-3 text-[10px] font-mono">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/70 border border-cyan-500/40 rounded text-cyan-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>CH1: {simulation?.channel1Voltage.toFixed(2) || '0.00'}V (1.0V/div)</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-pink-950/70 border border-pink-500/40 rounded text-pink-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    <span>CH2: {simulation?.channel2Voltage.toFixed(2) || '0.00'}V (1.0V/div)</span>
                  </div>
                </div>
              </div>

              {/* Scope Controls */}
              <div className="w-48 h-full bg-[#141822] rounded-lg border border-[#232c3d] p-2.5 flex flex-col justify-between text-xs font-mono">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TIMEBASE & TRIGGER
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Sweep:</span>
                    <span className="text-cyan-400 font-bold">{timeDivMs} ms/div</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="20"
                    value={timeDivMs}
                    onChange={(e) => setTimeDivMs(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <button
                  onClick={() => setIsScopePaused(!isScopePaused)}
                  className={`w-full py-1.5 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    isScopePaused
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-[#202736] hover:bg-[#2a3447] text-slate-200'
                  }`}
                >
                  {isScopePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isScopePaused ? 'RUN TRIGGER' : 'FREEZE FRAME'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VIRTUAL MULTIMETER */}
          {activeTab === 'meter' && (
            <div className="h-full flex items-center gap-4">
              {/* Digital LCD Screen */}
              <div className="flex-1 h-full bg-[#16201a] rounded-lg border border-[#233f2e] p-4 flex flex-col justify-between shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono text-emerald-500/80">
                  <span>TRUE RMS BENCH MULTIMETER</span>
                  <span className="animate-pulse font-bold">● AUTO-RANGE</span>
                </div>

                <div className="flex items-baseline justify-center gap-3">
                  <span className="font-mono text-5xl font-extrabold text-emerald-400 tracking-wider">
                    {meterReading.toFixed(meterMode === 'Ω' ? 0 : 2)}
                  </span>
                  <span className="font-mono text-2xl font-bold text-emerald-500">{meterUnit}</span>
                </div>

                <div className="flex justify-between text-[11px] font-mono text-emerald-600">
                  <span>RED PROBE: CH1 / ANODE</span>
                  <span>BLACK PROBE: COMMON GND</span>
                </div>
              </div>

              {/* Mode Controls */}
              <div className="w-56 h-full bg-[#141822] rounded-lg border border-[#232c3d] p-3 flex flex-col justify-between text-xs font-mono">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  MEASUREMENT MODE
                </span>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setMeterMode('V')}
                    className={`py-2 rounded font-bold transition-colors ${
                      meterMode === 'V'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#202736] text-slate-300 hover:bg-[#283244]'
                    }`}
                  >
                    DC V
                  </button>
                  <button
                    onClick={() => setMeterMode('mA')}
                    className={`py-2 rounded font-bold transition-colors ${
                      meterMode === 'mA'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#202736] text-slate-300 hover:bg-[#283244]'
                    }`}
                  >
                    DC mA
                  </button>
                  <button
                    onClick={() => setMeterMode('Ω')}
                    className={`py-2 rounded font-bold transition-colors ${
                      meterMode === 'Ω'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#202736] text-slate-300 hover:bg-[#283244]'
                    }`}
                  >
                    RES (Ω)
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 text-center">
                  Continuity test: <span className="text-emerald-400 font-bold">ACTIVE (0.02Ω)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MCU SERIAL MONITOR */}
          {activeTab === 'serial' && (
            <div className="h-full bg-[#0a0d13] rounded-lg border border-[#232c3d] p-3 font-mono text-xs overflow-y-auto space-y-1 text-slate-300">
              <div className="text-[10px] text-slate-500 border-b border-[#1f2738] pb-1 mb-1">
                --- Microcontroller UART Serial Interface (Baud: 115200) ---
              </div>
              {(serialLogs || []).map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-slate-600 select-none">[{idx + 1}]</span>
                  <span
                    className={
                      (log || '').includes('[EVENT]')
                        ? 'text-amber-400 font-bold'
                        : (log || '').includes('[STATE]')
                        ? 'text-cyan-300'
                        : 'text-slate-300'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
