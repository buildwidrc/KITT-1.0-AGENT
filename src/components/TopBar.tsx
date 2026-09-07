import React from 'react';
import {
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Cpu,
  Layers,
  Code2,
  Activity,
  Boxes,
  FileSpreadsheet,
  Zap,
  Plus,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { CanonicalProject } from '../types';

interface TopBarProps {
  project: CanonicalProject;
  setProject: React.Dispatch<React.SetStateAction<CanonicalProject>>;
  viewMode: '2d' | '3d';
  setViewMode: (mode: '2d' | '3d') => void;
  activeTab: 'canvas' | 'architecture' | 'firmware' | 'instruments' | 'bom';
  setActiveTab: (tab: 'canvas' | 'architecture' | 'firmware' | 'instruments' | 'bom') => void;
  isSimulating: boolean;
  setIsSimulating: (running: boolean) => void;
  simulationClockMs: number;
  resetSimulation: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  drcErrorCount: number;
  totalCurrentMa: number;
  openNewProjectModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  setProject,
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  isSimulating,
  setIsSimulating,
  simulationClockMs,
  resetSimulation,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  drcErrorCount,
  totalCurrentMa,
  openNewProjectModal,
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const fraction = Math.floor((ms % 1000) / 100);
    return `${seconds}.${fraction}s`;
  };

  const exportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${(project?.name || 'kitt_project').toLowerCase().replace(/\s+/g, '_')}.kitt.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="h-14 bg-[#11141a] border-b border-[#232936] px-3 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-[#232936]">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-950/40">
            <Cpu className="w-5 h-5 text-white" />
            {isSimulating && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-slate-100 font-mono">
                KITT <span className="text-violet-400">AI</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-violet-500/20 text-violet-300 font-mono rounded font-semibold border border-violet-500/30">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">IDE-Native Electronics</span>
          </div>
        </div>

        {/* Project Title and Inventions Dropdown */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-transparent hover:bg-[#181d26] focus:bg-[#181d26] px-2.5 py-1 rounded text-xs font-semibold text-slate-200 border border-transparent focus:border-violet-500/50 outline-none w-64 truncate transition-colors"
            title="Click to rename project"
          />

          <button
            onClick={openNewProjectModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#1a202c] hover:bg-[#242c3d] text-slate-300 border border-[#2d3748] transition-all hover:border-violet-500/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            <span>New Invention</span>
          </button>
        </div>
      </div>

      {/* Center Controls: View Switcher (2D / 3D) & Simulation Loop */}
      <div className="flex items-center gap-3">
        {/* Core 2D vs 3D Selector as specified in prompt section 7 */}
        <div className="flex items-center p-0.5 bg-[#0b0d12] rounded-lg border border-[#232936] shadow-inner">
          <button
            id="view-mode-2d-btn"
            onClick={() => {
              setViewMode('2d');
              setActiveTab('canvas');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
              viewMode === '2d' && activeTab === 'canvas'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D CIRCUIT</span>
          </button>
          <button
            id="view-mode-3d-btn"
            onClick={() => {
              setViewMode('3d');
              setActiveTab('canvas');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
              viewMode === '3d' && activeTab === 'canvas'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>3D LAB</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="hidden lg:flex items-center gap-1 border-l border-[#232936] pl-3">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'architecture'
                ? 'bg-[#202735] text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161a22]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('firmware')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'firmware'
                ? 'bg-[#202735] text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161a22]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Firmware</span>
          </button>
          <button
            onClick={() => setActiveTab('bom')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'bom'
                ? 'bg-[#202735] text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161a22]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>BOM</span>
          </button>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center gap-2 bg-[#0b0d12] px-2.5 py-1 rounded-lg border border-[#232936]">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold font-mono transition-all cursor-pointer ${
              isSimulating
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {isSimulating ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            )}
            <span>{isSimulating ? 'PAUSE' : 'SIMULATE'}</span>
          </button>

          <button
            onClick={resetSimulation}
            title="Reset Simulation Clock & State"
            className="p-1 hover:bg-[#1f2532] text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-[#232936] text-[11px] font-mono text-slate-300">
            <span className="text-slate-500">CLOCK:</span>
            <span className="text-emerald-400 font-bold">{formatTime(simulationClockMs)}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono pl-2 border-l border-[#232936]">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300">{totalCurrentMa} mA</span>
          </div>
        </div>
      </div>

      {/* Right Controls: DRC Status, Undo/Redo & Export */}
      <div className="flex items-center gap-2">
        {/* DRC Error indicator */}
        {drcErrorCount > 0 ? (
          <div
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-xs font-mono"
            title={`${drcErrorCount} design rule warnings detected`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{drcErrorCount} DRC</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>DRC PASS</span>
          </div>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center bg-[#0b0d12] rounded border border-[#232936] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export JSON project */}
        <button
          onClick={exportProjectJson}
          title="Export Canonical Project JSON"
          className="p-2 hover:bg-[#1a202c] text-slate-400 hover:text-slate-200 rounded border border-[#232936] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
