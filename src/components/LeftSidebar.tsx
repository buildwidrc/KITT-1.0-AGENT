import React, { useState } from 'react';
import {
  Cpu,
  FolderTree,
  Plus,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { ComponentCategory, ComponentType } from '../types';
import { COMPONENT_CATALOG } from '../data/componentDefinitions';

interface LeftSidebarProps {
  onAddComponent: (type: ComponentType) => void;
  onLoadPreset: (presetKey: 'traffic_light' | 'plant_watering') => void;
  activeTab: 'canvas' | 'architecture' | 'firmware' | 'instruments' | 'bom';
  setActiveTab: (tab: 'canvas' | 'architecture' | 'firmware' | 'instruments' | 'bom') => void;
  componentCount: number;
  wireCount: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onAddComponent,
  onLoadPreset,
  activeTab,
  setActiveTab,
  componentCount,
  wireCount,
}) => {
  const [selectedSection, setSelectedSection] = useState<'components' | 'files' | 'inventions'>('components');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    mcu: true,
    basic: true,
    input: true,
    sensor: true,
    output: true,
    power: true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories: { key: ComponentCategory; label: string }[] = [
    { key: 'mcu', label: 'Microcontrollers' },
    { key: 'output', label: 'Outputs & Actuators' },
    { key: 'sensor', label: 'Sensors & Transducers' },
    { key: 'input', label: 'Inputs & Switches' },
    { key: 'basic', label: 'Passives & Drivers' },
    { key: 'power', label: 'Power & Rails' },
  ];

  const componentsByCategory = (cat: ComponentCategory) => {
    return Object.values(COMPONENT_CATALOG).filter((c) => c.category === cat);
  };

  return (
    <aside className="w-64 bg-[#11141a] border-r border-[#232936] flex flex-col h-full shrink-0 z-20 select-none">
      {/* Sidebar Navigation Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-[#0c0e13] border-b border-[#232936] gap-1">
        <button
          onClick={() => setSelectedSection('components')}
          className={`py-1.5 px-2 text-[11px] font-semibold font-mono rounded flex items-center justify-center gap-1 transition-colors ${
            selectedSection === 'components'
              ? 'bg-[#1e2533] text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Library</span>
        </button>
        <button
          onClick={() => setSelectedSection('files')}
          className={`py-1.5 px-2 text-[11px] font-semibold font-mono rounded flex items-center justify-center gap-1 transition-colors ${
            selectedSection === 'files'
              ? 'bg-[#1e2533] text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>
        <button
          onClick={() => setSelectedSection('inventions')}
          className={`py-1.5 px-2 text-[11px] font-semibold font-mono rounded flex items-center justify-center gap-1 transition-colors ${
            selectedSection === 'inventions'
              ? 'bg-[#1e2533] text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Presets</span>
        </button>
      </div>

      {/* SECTION 1: COMPONENT LIBRARY */}
      {selectedSection === 'components' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono font-medium">
            <span>HARDWARE CATALOG</span>
            <span>{componentCount} active</span>
          </div>

          {categories.map(({ key, label }) => {
            const list = componentsByCategory(key);
            const isExpanded = expandedCategories[key] ?? true;

            return (
              <div key={key} className="space-y-1">
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-semibold text-slate-300 hover:text-white rounded hover:bg-[#161a22] transition-colors"
                >
                  <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider">{label}</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 gap-1.5 pl-1">
                    {list.map((item) => (
                      <div
                        key={item.type}
                        onClick={() => onAddComponent(item.type)}
                        className="group flex items-center justify-between p-2 rounded-md bg-[#161b24] hover:bg-[#1f2635] border border-[#232c3d] hover:border-violet-500/40 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">
                              {item.pins.length} pins
                            </span>
                          </div>
                        </div>

                        <button
                          title={`Insert ${item.name}`}
                          className="p-1 text-slate-400 hover:text-violet-300 hover:bg-violet-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 2: PROJECT FILE TREE */}
      {selectedSection === 'files' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          <div className="px-1 text-[11px] text-slate-400 font-mono font-medium">
            CANONICAL PROJECT TREE
          </div>

          <div className="space-y-1 font-mono text-xs">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors text-left ${
                activeTab === 'canvas'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-300 hover:bg-[#161b24]'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>circuit_model.sys</span>
            </button>

            <button
              onClick={() => setActiveTab('firmware')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors text-left ${
                activeTab === 'firmware'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-300 hover:bg-[#161b24]'
              }`}
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>firmware/main.cpp</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors text-left ${
                activeTab === 'architecture'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-300 hover:bg-[#161b24]'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>subsystems.arch</span>
            </button>

            <button
              onClick={() => setActiveTab('bom')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors text-left ${
                activeTab === 'bom'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-300 hover:bg-[#161b24]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>bom_inventory.csv</span>
            </button>
          </div>

          <div className="pt-4 px-2 border-t border-[#232936] text-[11px] text-slate-500 font-mono space-y-1">
            <div className="flex justify-between">
              <span>Active Nets:</span>
              <span className="text-slate-300">{wireCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Components:</span>
              <span className="text-slate-300">{componentCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Model Synced:</span>
              <span className="text-emerald-400">TRUE (1-to-1)</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: INVENTIONS PRESETS (MVP DEMONSTRATIONS) */}
      {selectedSection === 'inventions' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          <div className="px-1 text-[11px] text-slate-400 font-mono font-medium">
            MVP ENGINEERING DEMOS
          </div>

          {/* Demonstration 1: Traffic Light Controller */}
          <div
            onClick={() => onLoadPreset('traffic_light')}
            className="p-3 bg-[#161b24] hover:bg-[#1f2635] border border-[#232c3d] hover:border-violet-500/40 rounded-lg cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-violet-300">
                Traffic Light Intersection
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                ARDUINO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Arduino Uno + 3x LEDs + 220Ω ballast resistors + pedestrian request pushbutton with firmware.
            </p>
          </div>

          {/* Demonstration 2: Automatic Plant Watering */}
          <div
            onClick={() => onLoadPreset('plant_watering')}
            className="p-3 bg-[#161b24] hover:bg-[#1f2635] border border-[#232c3d] hover:border-violet-500/40 rounded-lg cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-violet-300">
                Smart Plant Watering
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
                ESP32 IoT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ESP32 + capacitive soil sensor + IRLZ44N MOSFET + 5V submersible water pump + battery power rail.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
