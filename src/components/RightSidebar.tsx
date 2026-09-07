import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Trash2,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  CircuitComponent,
  DrcIssue,
  SimulationMeasurement,
} from '../types';

interface RightSidebarProps {
  selectedComponent: CircuitComponent | null;
  onUpdateSelectedComponent: (updates: Partial<CircuitComponent>) => void;
  onDeleteSelectedComponent: () => void;
  onRotateSelectedComponent: () => void;
  drcIssues: DrcIssue[];
  onFixDrcIssue: (issue: DrcIssue) => void;
  simulation: SimulationMeasurement | null;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedComponent,
  onUpdateSelectedComponent,
  onDeleteSelectedComponent,
  onRotateSelectedComponent,
  drcIssues,
  onFixDrcIssue,
  simulation,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'drc'>('properties');

  return (
    <aside className="w-80 bg-[#11141a] border-l border-[#232936] flex flex-col h-full shrink-0 z-20 select-none">
      {/* Tab Switcher: Component Inspector & DRC Diagnostics */}
      <div className="grid grid-cols-2 p-1.5 bg-[#0c0e13] border-b border-[#232936] gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('properties')}
          className={`py-1.5 px-2 text-[11px] font-semibold font-mono rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'properties'
              ? 'bg-[#1e2533] text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('drc')}
          className={`py-1.5 px-2 text-[11px] font-semibold font-mono rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'drc'
              ? 'bg-[#1e2533] text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {drcIssues.length > 0 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>DRC ({drcIssues.length})</span>
        </button>
      </div>

      {/* COMPONENT INSPECTOR & PROPERTY EDITING */}
      {activeTab === 'properties' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {selectedComponent ? (
            <>
              {/* Header */}
              <div className="p-3 bg-[#161b24] rounded-lg border border-[#262f40] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100">{selectedComponent.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded border border-violet-500/30">
                    {selectedComponent.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>Ref: {selectedComponent.name}</span>
                  <span>•</span>
                  <span>Angle: {selectedComponent.rotation2d}°</span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#232c3d]">
                  <button
                    onClick={onRotateSelectedComponent}
                    className="flex-1 py-1 bg-[#202736] hover:bg-[#2b3548] text-violet-300 rounded text-xs font-mono flex items-center justify-center gap-1 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate</span>
                  </button>
                  <button
                    onClick={onDeleteSelectedComponent}
                    className="py-1 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-xs font-mono flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Interactive Component Controls */}
              <div className="p-3 bg-[#161b24] rounded-lg border border-[#262f40] space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  LIVE COMPONENT CONTROLS
                </span>

                {/* LED Color Selector */}
                {selectedComponent.type === 'led' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Emitted Color</label>
                    <div className="flex gap-2">
                      {['red', 'yellow', 'green', 'blue'].map((col) => (
                        <button
                          key={col}
                          onClick={() =>
                            onUpdateSelectedComponent({
                              properties: { ...selectedComponent.properties, color: col },
                            })
                          }
                          className={`flex-1 py-1 text-xs font-mono rounded capitalize transition-all border ${
                            selectedComponent.properties.color === col
                              ? 'border-white font-bold scale-105'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor:
                              col === 'red' ? '#ef4444' : col === 'yellow' ? '#eab308' : col === 'green' ? '#22c55e' : '#3b82f6',
                            color: '#000',
                          }}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resistor Resistance Input */}
                {selectedComponent.type === 'resistor' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Resistance Value (Ω)</label>
                    <div className="flex gap-2">
                      {[100, 220, 330, 1000, 10000].map((val) => (
                        <button
                          key={val}
                          onClick={() =>
                            onUpdateSelectedComponent({
                              properties: { ...selectedComponent.properties, resistance: val },
                            })
                          }
                          className={`flex-1 py-1 text-[11px] font-mono rounded border transition-colors ${
                            selectedComponent.properties.resistance === val
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-[#202736] text-slate-300 border-[#2d3748] hover:bg-[#283244]'
                          }`}
                        >
                          {val >= 1000 ? `${val / 1000}k` : `${val}Ω`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pushbutton Toggle */}
                {selectedComponent.type === 'pushbutton' && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300">Interactive Tactile Plunger</label>
                    <button
                      onMouseDown={() =>
                        onUpdateSelectedComponent({
                          properties: { ...selectedComponent.properties, isPressed: true },
                        })
                      }
                      onMouseUp={() =>
                        onUpdateSelectedComponent({
                          properties: { ...selectedComponent.properties, isPressed: false },
                        })
                      }
                      className={`w-full py-2.5 rounded font-mono text-xs font-bold transition-all shadow-inner ${
                        selectedComponent.properties.isPressed
                          ? 'bg-rose-600 text-white scale-98'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      }`}
                    >
                      {selectedComponent.properties.isPressed ? '● CONTACT CLOSED (PRESSED)' : '○ PRESS BUTTON'}
                    </button>
                    <p className="text-[10px] text-slate-500">Hold down to simulate finger press.</p>
                  </div>
                )}

                {/* Soil Moisture Slider */}
                {selectedComponent.type === 'soil_sensor' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Soil Moisture:</span>
                      <span className="text-cyan-400 font-bold">
                        {selectedComponent.properties.moisturePercent ?? 22}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedComponent.properties.moisturePercent ?? 22}
                      onChange={(e) =>
                        onUpdateSelectedComponent({
                          properties: {
                            ...selectedComponent.properties,
                            moisturePercent: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0% (Bone Dry)</span>
                      <span>100% (Saturated)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal / Pin Voltage Telemetry Table */}
              <div className="p-3 bg-[#161b24] rounded-lg border border-[#262f40] space-y-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  PIN VOLTAGE & STATE
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {selectedComponent.pins.map((pin) => {
                    const voltage = simulation?.pinVoltages[`${selectedComponent.id}.${pin.id}`];
                    const state = simulation?.pinStates[`${selectedComponent.id}.${pin.id}`];

                    return (
                      <div
                        key={pin.id}
                        className="flex items-center justify-between p-1.5 bg-[#0f1218] rounded border border-[#202736]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300 font-semibold">{pin.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase">({pin.type})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-1 rounded ${
                              state === 'HIGH'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : state === 'LOW'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {state || 'FLOAT'}
                          </span>
                          <span className="text-slate-200 font-bold">
                            {voltage !== undefined ? `${voltage.toFixed(2)}V` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Info className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Click any component in the 2D schematic or 3D scene to inspect electrical parameters.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DESIGN RULE CHECKS (DRC) */}
      {activeTab === 'drc' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              CIRCUIT HEALTH AUDIT
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                drcIssues.length === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {drcIssues.length === 0 ? 'NOMINAL' : `${drcIssues.length} ISSUES`}
            </span>
          </div>

          {drcIssues.length === 0 ? (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-semibold text-emerald-300">Design Rules Passed</h4>
              <p className="text-[11px] text-slate-400">
                All components are within safe voltage limits, polarity constraints, and current ratings.
              </p>
            </div>
          ) : (
            drcIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 bg-[#161b24] border border-amber-500/30 rounded-lg space-y-2 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-300">{issue.title}</h5>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{issue.description}</p>
                  </div>
                </div>

                {issue.suggestedFix && (
                  <div className="p-2 bg-[#0d1017] rounded text-[11px] text-slate-400 border border-[#232c3d]">
                    <span className="text-slate-300 font-semibold">Recommended Fix: </span>
                    {issue.suggestedFix}
                  </div>
                )}

                <button
                  onClick={() => onFixDrcIssue(issue)}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Apply Recommended Fix</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
