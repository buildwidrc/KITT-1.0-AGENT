import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Zap,
  Clock,
  Sparkles,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CircuitComponent, CircuitWire, SimulationMeasurement } from '../types';

interface LogicChannel {
  id: string;
  name: string;
  componentId: string;
  pinId: string;
  color: string;
  role: 'input' | 'output' | 'internal';
  active: boolean;
}

interface LogicSample {
  timestamp: number;
  values: Record<string, number>; // channelId -> 0 or 1
}

interface LogicAnalyzerProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  simulation: SimulationMeasurement | null;
  isSimulating: boolean;
  onUpdateComponent?: (id: string, updates: Partial<CircuitComponent>) => void;
}

const CHANNEL_COLORS = [
  '#38bdf8', // Sky Blue (Input A)
  '#f59e0b', // Amber (Input B)
  '#10b981', // Emerald (Sum)
  '#a855f7', // Violet (Carry)
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#8b5cf6', // Purple
];

export const LogicAnalyzer: React.FC<LogicAnalyzerProps> = ({
  components,
  wires,
  simulation,
  isSimulating,
  onUpdateComponent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<LogicSample[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeDivMs, setTimeDivMs] = useState<number>(50); // ms per division
  const [hoveredTimePos, setHoveredTimePos] = useState<{ x: number; sample: LogicSample | null } | null>(null);
  const [autoCycle, setAutoCycle] = useState<boolean>(false);
  const cycleIndexRef = useRef<number>(0);

  // Discover digital channels in current circuit
  const channels = useMemo<LogicChannel[]>(() => {
    const discovered: LogicChannel[] = [];
    let colorIdx = 0;

    // 1. Digital inputs (switches)
    components
      .filter((c) => c.type === 'logic_switch')
      .forEach((comp) => {
        discovered.push({
          id: `${comp.id}.out`,
          name: comp.label || comp.name,
          componentId: comp.id,
          pinId: 'out',
          color: CHANNEL_COLORS[colorIdx++ % CHANNEL_COLORS.length],
          role: 'input',
          active: true,
        });
      });

    // 2. Logic gates outputs
    components
      .filter((c) =>
        ['and_gate', 'or_gate', 'xor_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xnor_gate'].includes(c.type)
      )
      .forEach((comp) => {
        discovered.push({
          id: `${comp.id}.out_y`,
          name: comp.label || comp.name,
          componentId: comp.id,
          pinId: 'out_y',
          color: CHANNEL_COLORS[colorIdx++ % CHANNEL_COLORS.length],
          role: 'output',
          active: true,
        });
      });

    // 3. Logic probes
    components
      .filter((c) => c.type === 'logic_probe')
      .forEach((comp) => {
        discovered.push({
          id: `${comp.id}.in`,
          name: comp.label || comp.name,
          componentId: comp.id,
          pinId: 'in',
          color: CHANNEL_COLORS[colorIdx++ % CHANNEL_COLORS.length],
          role: 'output',
          active: true,
        });
      });

    // 4. If MCU present, add primary digital outputs
    const mcu = components.find((c) => c.type === 'arduino_uno' || c.type === 'esp32');
    if (mcu && discovered.length === 0) {
      ['D12', 'D11', 'D10', 'D2'].forEach((pin) => {
        discovered.push({
          id: `${mcu.id}.${pin}`,
          name: `${mcu.name} ${pin}`,
          componentId: mcu.id,
          pinId: pin,
          color: CHANNEL_COLORS[colorIdx++ % CHANNEL_COLORS.length],
          role: pin === 'D2' ? 'input' : 'output',
          active: true,
        });
      });
    }

    return discovered;
  }, [components]);

  // Read current logic values
  const currentValues = useMemo<Record<string, number>>(() => {
    const vals: Record<string, number> = {};
    if (!simulation) return vals;

    channels.forEach((ch) => {
      const v = simulation.pinVoltages[ch.id];
      const compState = simulation.componentStates[ch.componentId];

      if (v !== undefined) {
        vals[ch.id] = v >= 2.0 ? 1 : 0;
      } else if (compState) {
        if (compState.logicState !== undefined) {
          vals[ch.id] = compState.logicState === 1 ? 1 : 0;
        } else if (compState.value !== undefined) {
          vals[ch.id] = compState.value === 1 ? 1 : 0;
        } else if (compState.state !== undefined) {
          vals[ch.id] = compState.state === 1 || compState.state === true ? 1 : 0;
        } else {
          vals[ch.id] = 0;
        }
      } else {
        vals[ch.id] = 0;
      }
    });

    return vals;
  }, [channels, simulation]);

  // Automated Pattern Generator (Cycles inputs 00 -> 01 -> 10 -> 11)
  useEffect(() => {
    if (!autoCycle || !onUpdateComponent) return;

    const switches = components.filter((c) => c.type === 'logic_switch');
    if (switches.length < 2) return;

    const interval = setInterval(() => {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % 4;
      const step = cycleIndexRef.current;

      const valA = (step >> 1) & 1;
      const valB = step & 1;

      onUpdateComponent(switches[0].id, {
        properties: { ...switches[0].properties, state: valA, voltage: valA ? 5.0 : 0.0 },
      });
      onUpdateComponent(switches[1].id, {
        properties: { ...switches[1].properties, state: valB, voltage: valB ? 5.0 : 0.0 },
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [autoCycle, components, onUpdateComponent]);

  // Buffer Recording Loop
  useEffect(() => {
    if (isPaused || channels.length === 0) return;

    const sample: LogicSample = {
      timestamp: Date.now(),
      values: { ...currentValues },
    };

    bufferRef.current.push(sample);
    if (bufferRef.current.length > 250) {
      bufferRef.current.shift();
    }
  }, [simulation, currentValues, isPaused, channels]);

  // Canvas Waveform Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const activeChannels = channels.filter((c) => c.active);
    const numChannels = activeChannels.length || 1;

    // Clear background: deep dark engineering slate
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(0, 0, width, height);

    // Track height calculation
    const headerH = 20;
    const availableH = height - headerH;
    const trackH = availableH / numChannels;

    // Time division background grid
    ctx.strokeStyle = '#151b26';
    ctx.lineWidth = 1;
    const numDivs = 10;
    const divWidth = width / numDivs;

    for (let i = 0; i <= numDivs; i++) {
      const x = i * divWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Top timeline tick marks
      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      if (i < numDivs) {
        const timeOffsetSec = ((numDivs - i) * (timeDivMs * 2)) / 1000;
        ctx.fillText(`-${timeOffsetSec.toFixed(1)}s`, x + 3, 13);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillText('NOW', x - 26, 13);
      }
    }

    const buffer = bufferRef.current;
    const totalSamples = buffer.length;

    // Draw Channel Tracks & Digital Waveforms
    activeChannels.forEach((ch, idx) => {
      const trackTop = headerH + idx * trackH;
      const trackBottom = trackTop + trackH;
      const highY = trackTop + trackH * 0.22;
      const lowY = trackTop + trackH * 0.78;

      // Track separator line
      ctx.strokeStyle = '#1e2638';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, trackBottom);
      ctx.lineTo(width, trackBottom);
      ctx.stroke();

      // Channel Baseline (Low level guide)
      ctx.strokeStyle = '#141a24';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, lowY);
      ctx.lineTo(width, lowY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw digital waveform pulses
      if (totalSamples > 1) {
        ctx.beginPath();
        let prevX = 0;
        let prevVal = buffer[0]?.values[ch.id] ?? 0;
        let prevY = prevVal === 1 ? highY : lowY;

        ctx.moveTo(0, prevY);

        for (let s = 0; s < totalSamples; s++) {
          const sample = buffer[s];
          const curVal = sample.values[ch.id] ?? 0;
          const curY = curVal === 1 ? highY : lowY;
          const x = (s / (totalSamples - 1)) * width;

          if (curVal !== prevVal) {
            // Horizontal line to transition point
            ctx.lineTo(x, prevY);
            // Crisp vertical step edge
            ctx.lineTo(x, curY);
          } else {
            ctx.lineTo(x, curY);
          }

          prevVal = curVal;
          prevY = curY;
          prevX = x;
        }

        // Fill high pulse area with translucent glow
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Shaded pulse fill
        ctx.lineTo(width, lowY);
        ctx.lineTo(0, lowY);
        ctx.closePath();
        ctx.fillStyle = `${ch.color}15`;
        ctx.fill();
      }

      // Live logic level pill label at current state (right edge)
      const latestVal = currentValues[ch.id] ?? 0;
      const badgeY = latestVal === 1 ? highY : lowY;

      ctx.fillStyle = latestVal === 1 ? '#064e3b' : '#1e293b';
      ctx.strokeStyle = latestVal === 1 ? '#10b981' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(width - 32, badgeY - 7, 24, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = latestVal === 1 ? '#4ade80' : '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(latestVal === 1 ? 'HIGH' : 'LOW', width - 20, badgeY + 3);
      ctx.textAlign = 'start';
    });

    // Hover Scrub Line
    if (hoveredTimePos) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredTimePos.x, 0);
      ctx.lineTo(hoveredTimePos.x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [channels, currentValues, timeDivMs, hoveredTimePos]);

  // Mouse scrub handler
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const buffer = bufferRef.current;

    if (buffer.length > 0) {
      const idx = Math.min(Math.max(Math.round((x / canvas.width) * (buffer.length - 1)), 0), buffer.length - 1);
      setHoveredTimePos({ x, sample: buffer[idx] });
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredTimePos(null);
  };

  // Helper to toggle digital inputs manually
  const handleToggleSwitch = (switchNameOrId: string) => {
    if (!onUpdateComponent) return;
    const comp = components.find(
      (c) => c.type === 'logic_switch' && (c.id === switchNameOrId || c.name === switchNameOrId || c.label.includes(switchNameOrId))
    );
    if (!comp) return;

    const cur = comp.properties?.state === 1 || comp.properties?.state === true ? 1 : 0;
    const next = cur === 1 ? 0 : 1;
    onUpdateComponent(comp.id, {
      properties: {
        ...comp.properties,
        state: next,
        voltage: next === 1 ? 5.0 : 0.0,
      },
    });
  };

  // Get active inputs for Truth Table detection
  const switchA = components.find((c) => c.type === 'logic_switch' && (c.name.includes('A') || c.label.includes('A'))) || components.filter((c) => c.type === 'logic_switch')[0];
  const switchB = components.find((c) => c.type === 'logic_switch' && (c.name.includes('B') || c.label.includes('B'))) || components.filter((c) => c.type === 'logic_switch')[1];

  const valA = switchA ? (switchA.properties?.state === 1 ? 1 : 0) : 0;
  const valB = switchB ? (switchB.properties?.state === 1 ? 1 : 0) : 0;
  const currentSum = valA ^ valB;
  const currentCarry = valA & valB;

  return (
    <div className="h-full flex flex-col select-none text-slate-200">
      {/* Top Controls Toolbar */}
      <div className="h-8 px-3 bg-[#0a0d14] border-b border-[#1e2638] flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{isPaused ? 'HOLD / INSPECT' : 'SAMPLING (100 kSa/s)'}</span>
          </div>

          {/* Quick Input Stimulus Toggles */}
          {switchA && (
            <button
              onClick={() => handleToggleSwitch(switchA.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                valA === 1
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                  : 'bg-[#182030] text-slate-400 border-[#2a364f] hover:text-white'
              }`}
            >
              <span>IN A:</span>
              <span className="font-extrabold">{valA}</span>
            </button>
          )}

          {switchB && (
            <button
              onClick={() => handleToggleSwitch(switchB.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                valB === 1
                  ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                  : 'bg-[#182030] text-slate-400 border-[#2a364f] hover:text-white'
              }`}
            >
              <span>IN B:</span>
              <span className="font-extrabold">{valB}</span>
            </button>
          )}

          {/* Auto Pattern Sequencer */}
          {switchA && switchB && (
            <button
              onClick={() => setAutoCycle(!autoCycle)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoCycle
                  ? 'bg-violet-600 text-white border-violet-400 shadow-sm'
                  : 'bg-[#182030] text-slate-300 border-[#2a364f] hover:bg-[#202b40]'
              }`}
              title="Automatically cycle inputs through binary truth table (00 -> 01 -> 10 -> 11)"
            >
              <Sparkles className={`w-3 h-3 ${autoCycle ? 'animate-spin' : 'text-violet-400'}`} />
              <span>{autoCycle ? 'CLK RUNNING (0.8 Hz)' : 'AUTO PATTERN'}</span>
            </button>
          )}
        </div>

        {/* Right side controls: Timebase & Pause */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Timebase:</span>
            <select
              value={timeDivMs}
              onChange={(e) => setTimeDivMs(Number(e.target.value))}
              className="bg-[#141b27] border border-[#27344a] text-cyan-300 rounded px-1.5 py-0.5 font-bold cursor-pointer"
            >
              <option value="10">10 ms/div</option>
              <option value="25">25 ms/div</option>
              <option value="50">50 ms/div</option>
              <option value="100">100 ms/div</option>
              <option value="200">200 ms/div</option>
            </select>
          </div>

          <button
            onClick={() => {
              bufferRef.current = [];
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#1a2233] rounded transition-colors"
            title="Clear buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isPaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-[#1c2436] hover:bg-[#253047] text-slate-200'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'RUN' : 'FREEZE'}</span>
          </button>
        </div>
      </div>

      {/* Main Analyzer Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Channel Legends and Live State Badges */}
        <div className="w-44 bg-[#0b0e16] border-r border-[#1e2638] flex flex-col justify-around py-2 px-2.5 shrink-0 text-xs font-mono">
          {channels.filter((c) => c.active).map((ch, idx) => {
            const val = currentValues[ch.id] ?? 0;
            return (
              <div
                key={ch.id}
                className="flex items-center justify-between p-1 rounded bg-[#111622] border border-[#1e2739]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: ch.color }}
                  />
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-slate-200 truncate leading-none">
                      {ch.name.split('(')[0].trim()}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-tighter">
                      D{idx} • {ch.role}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    val === 1
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-500 border border-slate-700'
                  }`}
                >
                  {val === 1 ? 'HIGH' : 'LOW'}
                </span>
              </div>
            );
          })}

          {channels.length === 0 && (
            <div className="text-[11px] text-slate-500 text-center italic p-2">
              No digital channels discovered. Add logic gates or switches.
            </div>
          )}
        </div>

        {/* Center: Real-time Multi-Track Digital Waveform Canvas */}
        <div className="flex-1 relative bg-[#080a0f] overflow-hidden flex flex-col">
          <canvas
            ref={canvasRef}
            width={720}
            height={160}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            className="w-full h-full cursor-crosshair"
          />

          {/* Scrubber Tooltip when hovering over waveform */}
          {hoveredTimePos?.sample && (
            <div
              className="absolute top-2 bg-[#0e1420]/95 border border-[#3b82f6] text-slate-200 text-[10px] font-mono px-2 py-1 rounded shadow-xl pointer-events-none z-30"
              style={{
                left: Math.min(hoveredTimePos.x + 10, 520),
              }}
            >
              <div className="text-cyan-400 font-bold border-b border-[#23304a] pb-0.5 mb-1">
                CURSOR TIME INSPECTOR
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {channels
                  .filter((c) => c.active)
                  .map((ch) => (
                    <div key={ch.id} className="flex justify-between gap-1.5">
                      <span style={{ color: ch.color }}>{ch.name.split('(')[0]}:</span>
                      <span className="font-bold text-white">
                        {hoveredTimePos.sample?.values[ch.id] ?? 0}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Integrated Digital Truth Table Verification Box */}
        <div className="w-56 bg-[#0c1018] border-l border-[#1e2638] p-2 flex flex-col justify-between shrink-0 font-mono text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1e2638]">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>TRUTH TABLE</span>
              </span>
              <span className="text-emerald-400 font-bold">1-BIT ADDER</span>
            </div>

            {/* Truth Table Grid */}
            <div className="w-full text-[10px] border border-[#1f283b] rounded overflow-hidden">
              <div className="grid grid-cols-4 bg-[#141b27] text-slate-400 font-bold p-1 text-center border-b border-[#1f283b]">
                <span>A</span>
                <span>B</span>
                <span className="text-emerald-400">SUM</span>
                <span className="text-purple-400">CRY</span>
              </div>

              {[
                { a: 0, b: 0, s: 0, c: 0 },
                { a: 0, b: 1, s: 1, c: 0 },
                { a: 1, b: 0, s: 1, c: 0 },
                { a: 1, b: 1, s: 0, c: 1 },
              ].map((row, rIdx) => {
                const isActive = valA === row.a && valB === row.b;
                return (
                  <div
                    key={rIdx}
                    className={`grid grid-cols-4 p-1 text-center font-mono transition-colors ${
                      isActive
                        ? 'bg-emerald-950/80 text-emerald-200 font-bold border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-[#111722]'
                    }`}
                  >
                    <span>{row.a}</span>
                    <span>{row.b}</span>
                    <span className={isActive && row.s === 1 ? 'text-emerald-300 font-bold' : ''}>
                      {row.s}
                    </span>
                    <span className={isActive && row.c === 1 ? 'text-purple-300 font-bold' : ''}>
                      {row.c}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Adder Algebraic Equation Status */}
          <div className="p-1.5 rounded bg-[#101520] border border-[#1e283b] text-[10px]">
            <div className="text-slate-400">Arithmetic Equation:</div>
            <div className="text-emerald-400 font-bold mt-0.5">
              {valA} + {valB} = {valA + valB} (Binary: {currentCarry}{currentSum}₂)
            </div>
            <div className="text-slate-500 text-[9px] mt-0.5">
              S = A ⊕ B ({currentSum}) | C = A · B ({currentCarry})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
