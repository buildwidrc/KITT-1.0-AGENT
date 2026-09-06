import React, { useState } from 'react';
import { Sparkles, Cpu, Layers, CheckCircle2, ArrowRight, Zap, X } from 'lucide-react';
import { ViewMode } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildProject: (prompt: string, initialView: ViewMode) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onBuildProject,
}) => {
  const [prompt, setPrompt] = useState('Build a smart plant watering system using an ESP32, soil moisture sensor, pump, and MOSFET.');
  const [selectedView, setSelectedView] = useState<ViewMode>('3d');
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    'Understanding natural language engineering requirements',
    'Selecting active ICs, passive ballasts, and transducers',
    'Synthesizing electrical topology & net connectivity',
    'Computing physical coordinates & 3D breadboard layout',
    'Synthesizing C++ firmware & pin register mapping',
    'Running Design Rule Checks & SPICE validation',
  ];

  if (!isOpen) return null;

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);
    setCurrentStepIndex(0);

    // Simulate animated construction sequence
    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i);
      await new Promise((r) => setTimeout(r, 450));
    }

    await onBuildProject(prompt, selectedView);
    setIsBuilding(false);
    onClose();
  };

  const sampleIdeas = [
    'Build a traffic light controller with an Arduino, 3 LEDs, and a pedestrian button',
    'Build an automatic plant watering system with ESP32 and soil sensor',
    'Create a 5V regulated power supply with a buzzer alarm',
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#11141c] border border-[#293245] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-900/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono">NEW KITT AI INVENTION</h2>
              <p className="text-[11px] text-slate-400">Describe what you want to build. KITT builds the project.</p>
            </div>
          </div>

          {!isBuilding && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#1a202c] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!isBuilding ? (
            <>
              {/* Prompt Input Box */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  WHAT DO YOU WANT TO INVENT?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Build an automatic plant watering system using an ESP32..."
                  rows={3}
                  className="w-full p-3.5 bg-[#161b26] border border-[#2a3449] focus:border-violet-500 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 outline-none leading-relaxed transition-colors shadow-inner"
                />
              </div>

              {/* Sample Inspiration Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500">QUICK INSPIRATION:</span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleIdeas.map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(idea)}
                      className="text-[11px] font-mono px-2.5 py-1 bg-[#161b24] hover:bg-[#202735] text-slate-300 border border-[#232c3d] rounded-lg transition-colors text-left"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2D vs 3D Selection */}
              <div className="space-y-2 pt-2 border-t border-[#232a3b]">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  PRIMARY PRESENTATION MODE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedView('2d')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                      selectedView === '2d'
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                        : 'bg-[#161b26] border-[#252f44] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-violet-400" />
                    <div className="text-left">
                      <div className="text-xs font-bold font-mono">2D SCHEMATIC</div>
                      <div className="text-[10px] text-slate-400">Engineering schematic with net symbols</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedView('3d')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                      selectedView === '3d'
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                        : 'bg-[#161b26] border-[#252f44] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    <div className="text-left">
                      <div className="text-xs font-bold font-mono">3D PHYSICAL LAB</div>
                      <div className="text-[10px] text-slate-400">Interactive 3D breadboard prototype</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Construction Progress Animation */
            <div className="py-6 space-y-4 font-mono">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-violet-400 animate-pulse">
                  KITT AI IS CONSTRUCTING YOUR PROJECT...
                </span>
                <p className="text-[11px] text-slate-400">
                  Compiling canonical project model, 3D physics meshes, and microcontroller firmware.
                </p>
              </div>

              <div className="space-y-2 max-w-md mx-auto pt-2">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                        isCurrent
                          ? 'bg-violet-950/40 text-violet-200 border border-violet-500/40'
                          : isDone
                          ? 'text-emerald-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Sparkles className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isBuilding && (
          <div className="px-6 py-4 bg-[#0f121a] border-t border-[#232a3b] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Deterministic simulation & firmware included
            </span>

            <button
              onClick={handleBuild}
              disabled={!prompt.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-950/50"
            >
              <span>BUILD WITH KITT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
