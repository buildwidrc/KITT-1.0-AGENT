import React from 'react';
import { SubsystemBlock, CircuitComponent } from '../types';
import { Zap, ShieldCheck, Activity, Cpu, ArrowRight, Layers } from 'lucide-react';

interface ArchitectureViewProps {
  architecture: SubsystemBlock[];
  components: CircuitComponent[];
  onSelectComponent: (id: string) => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({
  architecture,
  components,
  onSelectComponent,
}) => {
  return (
    <div className="w-full h-full bg-[#0d1017] p-8 overflow-y-auto select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-wide">
              SYSTEM ENGINEERING ARCHITECTURE
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Hierarchical decomposition of power, sensing, control logic, and physical actuators.
          </p>
        </div>

        {/* Subsystem Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architecture.map((subsystem, idx) => {
            const mappedComps = components.filter((c) => subsystem.componentIds.includes(c.id));

            return (
              <div
                key={subsystem.id}
                className="p-5 bg-[#141824] rounded-xl border border-[#232c3d] space-y-3 shadow-lg relative overflow-hidden group hover:border-violet-500/40 transition-all"
              >
                {/* Header with status badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      STAGE 0{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{subsystem.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                      subsystem.status === 'active'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {subsystem.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{subsystem.description}</p>

                {/* Subsystem Component List */}
                <div className="pt-2 border-t border-[#212a3b] space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    ASSIGNED COMPONENTS ({mappedComps.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {mappedComps.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => onSelectComponent(comp.id)}
                        className="px-2.5 py-1 bg-[#1c2333] hover:bg-violet-600/30 hover:text-violet-200 text-slate-300 rounded text-xs font-mono border border-[#29354a] transition-colors flex items-center gap-1.5"
                      >
                        <Cpu className="w-3 h-3 text-slate-400" />
                        <span>{comp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Health Summary Footer */}
        <div className="p-4 bg-[#141824] rounded-xl border border-[#232c3d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">All Subsystems Synchronized</h4>
              <p className="text-[11px] text-slate-400">
                1-to-1 canonical correspondence with 2D schematic, 3D laboratory scene, and C++ firmware.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
