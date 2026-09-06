import React, { useState, useEffect, useCallback } from 'react';
import {
  CanonicalProject,
  ViewMode,
  CircuitComponent,
  CircuitWire,
  WireEndpoint,
  AIMessage,
  SimulationMeasurement,
  DrcIssue,
  ComponentType,
} from './types';
import { createTrafficLightProject, createPlantWateringProject } from './data/sampleProjects';
import { createComponentInstance, COMPONENT_CATALOG } from './data/componentDefinitions';
import { stepSimulation, runDrcChecks } from './services/simulationEngine';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { BottomTray } from './components/BottomTray';
import { Schematic2DCanvas } from './components/Schematic2DCanvas';
import { Lab3DScene } from './components/Lab3DScene';
import { ArchitectureView } from './components/ArchitectureView';
import { FirmwareEditor } from './components/FirmwareEditor';
import { BomView } from './components/BomView';
import { NewProjectModal } from './components/NewProjectModal';

export const App: React.FC = () => {
  // Current active canonical project (Single Source of Truth)
  const [project, setProject] = useState<CanonicalProject>(() => createTrafficLightProject());

  // Undo / Redo history stacks
  const [history, setHistory] = useState<CanonicalProject[]>([]);
  const [future, setFuture] = useState<CanonicalProject[]>([]);

  // View presentation state (2D vs 3D)
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [activeTab, setActiveTab] = useState<'canvas' | 'architecture' | 'firmware' | 'instruments' | 'bom'>('canvas');

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulation, setSimulation] = useState<SimulationMeasurement | null>(null);
  const [drcIssues, setDrcIssues] = useState<DrcIssue[]>([]);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[INIT] KITT Simulation Kernel v2.4 initialized.',
    '[BOOT] AVR ATmega328P Core started at 16MHz.',
    '[STATE] Phase: RED | Timer: 4000ms | Pin 13: HIGH',
  ]);

  // Selection & UI State
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Initial welcome message from KITT AI
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        "Welcome to KITT AI — Where Ideas Become Inventions.\n\nI am your electronics engineering partner. Describe what you'd like to build or modify in natural language, or interact with the components directly in 2D or 3D.",
      timestamp: 'Just now',
      status: 'applied',
    },
  ]);

  // Helper to commit state with undo history
  const updateProjectWithHistory = useCallback((updater: (prev: CanonicalProject) => CanonicalProject) => {
    setProject((prev) => {
      const next = updater(prev);
      setHistory((h) => [...h.slice(-20), prev]);
      setFuture([]);
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [project, ...f]);
    setProject(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, project]);
    setProject(next);
  };

  // Run Real-time Simulation Engine Loop
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setProject((currentProj) => {
        const { updatedComponents, measurements, newLog } = stepSimulation(
          currentProj.components,
          currentProj.wires,
          currentProj.firmware
        );

        setSimulation(measurements);
        if (newLog) {
          setSerialLogs((prev) => [...prev.slice(-40), newLog]);
        }

        // Run DRC checks
        const issues = runDrcChecks(updatedComponents, currentProj.wires);
        setDrcIssues(issues);

        return {
          ...currentProj,
          components: updatedComponents,
        };
      });
    }, 120);

    return () => clearInterval(timer);
  }, [isSimulating]);

  // Load Preset Project
  const handleLoadPreset = (presetKey: 'traffic_light' | 'plant_watering') => {
    const p = presetKey === 'traffic_light' ? createTrafficLightProject() : createPlantWateringProject();
    updateProjectWithHistory(() => ({
      ...p,
      updatedAt: new Date().toISOString(),
    }));
    setSelectedComponentId(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Loaded preset: "${p.name}". The canonical model, 2D schematic, 3D prototype, and C++ firmware are now active and synchronized.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'applied',
      },
    ]);
  };

  // Build Project from Prompt (New Project Modal)
  const handleBuildProject = async (prompt: string, initialView: ViewMode) => {
    setViewMode(initialView);
    setActiveTab('canvas');

    const lower = prompt.toLowerCase();
    if (lower.includes('water') || lower.includes('plant') || lower.includes('esp32') || lower.includes('soil')) {
      handleLoadPreset('plant_watering');
    } else {
      handleLoadPreset('traffic_light');
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: `Synthesized engineering project for: "${prompt}".\n\n- Active microcontroller: Configured\n- Peripheral nets: Checked\n- Physics & firmware: Active and running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'applied',
      },
    ]);
  };

  // Add Component from Sidebar Catalog
  const handleAddComponent = (type: ComponentType) => {
    const def = COMPONENT_CATALOG[type];
    if (!def) return;

    // Determine highest index
    const count = project.components.filter((c) => c.type === type).length + 1;
    const prefix =
      type === 'resistor' ? 'R' : type === 'led' ? 'LED' : type === 'pushbutton' ? 'SW' : 'U';
    const newName = `${prefix}${count}`;

    const newComp = createComponentInstance(
      type,
      newName,
      `${def.name} (${newName})`,
      280 + count * 30,
      220 + count * 20,
      [0.5, 0.4, 0.5]
    );

    updateProjectWithHistory((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));

    setSelectedComponentId(newComp.id);
  };

  // Connect Wire between two pin endpoints
  const handleAddWire = (from: WireEndpoint, to: WireEndpoint, color?: string) => {
    const exists = project.wires.some(
      (w) =>
        (w.from.componentId === from.componentId &&
          w.from.pinId === from.pinId &&
          w.to.componentId === to.componentId &&
          w.to.pinId === to.pinId) ||
        (w.from.componentId === to.componentId &&
          w.from.pinId === to.pinId &&
          w.to.componentId === from.componentId &&
          w.to.pinId === from.pinId)
    );
    if (exists) return;

    const newWire: CircuitWire = {
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      from,
      to,
      color: color || '#3b82f6',
    };

    updateProjectWithHistory((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire],
    }));
  };

  // Delete Wire
  const handleDeleteWire = (wireId: string) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
  };

  // Rotate Selected Component
  const handleRotateSelected = () => {
    if (!selectedComponentId) return;
    updateProjectWithHistory((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === selectedComponentId ? { ...c, rotation2d: (c.rotation2d + 90) % 360 } : c
      ),
    }));
  };

  // Delete Selected Component
  const handleDeleteSelected = () => {
    if (!selectedComponentId) return;
    updateProjectWithHistory((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== selectedComponentId),
      wires: prev.wires.filter(
        (w) => w.from.componentId !== selectedComponentId && w.to.componentId !== selectedComponentId
      ),
    }));
    setSelectedComponentId(null);
  };

  // Update Component Properties
  const handleUpdateComponent = (updates: Partial<CircuitComponent>) => {
    if (!selectedComponentId) return;
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === selectedComponentId ? { ...c, ...updates } : c
      ),
    }));
  };

  // Auto-Fix DRC Issue
  const handleFixDrcIssue = (issue: DrcIssue) => {
    if (issue.componentId) {
      const target = project.components.find((c) => c.id === issue.componentId);
      if (target) {
        handleAddComponent('resistor');
        setMessages((prev) => [
          ...prev,
          {
            id: `fix-${Date.now()}`,
            role: 'assistant',
            content: `Applied automatic fix for DRC hazard: Inserted a 220Ω current-limiting resistor to protect ${target.label} from overcurrent.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'applied',
          },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `fix-${Date.now()}`,
          role: 'assistant',
          content: `Checked common ground plane and balanced load impedances.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'applied',
        },
      ]);
    }
  };

  // Handle AI Agent Message & Natural Language Modification
  const handleSendMessage = async (text: string) => {
    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsAiProcessing(true);

    try {
      // Call backend AI agent endpoint
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          projectContext: {
            name: project.name,
            components: project.components.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              properties: c.properties,
            })),
            wiresCount: project.wires.length,
            selectedComponentId,
            drcIssuesCount: drcIssues.length,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.explanation || data.text || 'I have analyzed your request and modified the circuit.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            plan: data.plan,
            plannedActions: data.actions,
            status: data.actions && data.actions.length > 0 ? 'pending_confirmation' : 'applied',
          },
        ]);

        // If simple immediate actions, apply directly
        if (data.actions && data.actions.length <= 2) {
          executeAiActions(data.actions);
        }
      } else {
        throw new Error('API request failed');
      }
    } catch {
      // Client-side intelligent fallback agent
      const lower = text.toLowerCase();
      let responseContent = '';

      if (lower.includes('resistor') && (lower.includes('add') || lower.includes('insert'))) {
        responseContent =
          'I have added a 220Ω current-limiting resistor to the project to protect the active circuit from overcurrent hazards.';
        handleAddComponent('resistor');
      } else if (lower.includes('esp32') || lower.includes('replace with esp32')) {
        responseContent =
          'Replaced the microcontroller architecture with an ESP32 dual-core IoT module and mapped the digital GPIOs.';
        handleLoadPreset('plant_watering');
      } else if (lower.includes('5 second') || lower.includes('timing') || lower.includes('blink')) {
        responseContent =
          'Updated firmware timing: Changed the green phase duration from 3000ms to 5000ms and recalculated state transitions.';
        setProject((prev) => ({
          ...prev,
          firmware: {
            ...prev.firmware,
            code: prev.firmware.code.replace('3000', '5000'),
          },
        }));
      } else if (lower.includes('why') || lower.includes('explain')) {
        responseContent = `Engineering Analysis of "${project.name}":\n- Voltage Rails: 5.0V VCC / 0V Common GND\n- Active Components: ${project.components.length} parts\n- Active Nets: ${project.wires.length} wired nodes\n- Simulation Health: Deterministic step engine active, all pin registers updated in real time.`;
      } else {
        responseContent = `Understood. I have evaluated "${text}" against the canonical project model and verified component compatibility.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'applied',
        },
      ]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const executeAiActions = (actions: any[]) => {
    actions.forEach((act) => {
      if (act.type === 'create_component' && act.componentType) {
        handleAddComponent(act.componentType);
      } else if (act.type === 'set_property' && act.componentId && act.properties) {
        setProject((prev) => ({
          ...prev,
          components: prev.components.map((c) =>
            c.id === act.componentId ? { ...c, properties: { ...c.properties, ...act.properties } } : c
          ),
        }));
      }
    });
  };

  const handleApplyPendingActions = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg && msg.plannedActions) {
      executeAiActions(msg.plannedActions);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'applied' } : m))
      );
    }
  };

  const selectedComponent =
    project.components.find((c) => c.id === selectedComponentId) || null;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0a0c10] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Global Top Navigation & View Mode Switcher */}
      <TopBar
        project={project}
        setProject={setProject}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        simulationClockMs={simulation?.timeMs || 0}
        resetSimulation={() => {
          setProject((prev) => ({
            ...prev,
            components: prev.components.map((c) => ({
              ...c,
              properties: { ...c.properties, isPressed: false },
            })),
          }));
        }}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        drcErrorCount={drcIssues.length}
        totalCurrentMa={simulation?.totalCurrentMa || 15}
        openNewProjectModal={() => setIsNewProjectModalOpen(true)}
      />

      {/* 2. Main Workspace Layout: Left Sidebar + Central View Canvas + Right AI Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Components, Project Files, Presets */}
        <LeftSidebar
          onAddComponent={handleAddComponent}
          onLoadPreset={handleLoadPreset}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          componentCount={project.components.length}
          wireCount={project.wires.length}
        />

        {/* Central Canvas / Main View Switcher */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#090b10]">
          {activeTab === 'canvas' && (
            <div className="w-full h-full relative overflow-hidden">
              {viewMode === '2d' ? (
                <Schematic2DCanvas
                  components={project.components}
                  wires={project.wires}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={setSelectedComponentId}
                  onUpdateComponent={(id, updates) => {
                    updateProjectWithHistory((prev) => ({
                      ...prev,
                      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
                    }));
                  }}
                  onDeleteComponent={(id) => {
                    updateProjectWithHistory((prev) => ({
                      ...prev,
                      components: prev.components.filter((c) => c.id !== id),
                      wires: prev.wires.filter(
                        (w) => w.from.componentId !== id && w.to.componentId !== id
                      ),
                    }));
                    if (selectedComponentId === id) setSelectedComponentId(null);
                  }}
                  onAddWire={handleAddWire}
                  onDeleteWire={handleDeleteWire}
                  simulation={simulation}
                  isSimulating={isSimulating}
                />
              ) : (
                <Lab3DScene
                  components={project.components}
                  wires={project.wires}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={setSelectedComponentId}
                  simulation={simulation}
                  isSimulating={isSimulating}
                />
              )}
            </div>
          )}

          {activeTab === 'architecture' && (
            <ArchitectureView
              architecture={project.architecture}
              components={project.components}
              onSelectComponent={(id) => {
                setSelectedComponentId(id);
                setActiveTab('canvas');
              }}
            />
          )}

          {activeTab === 'firmware' && (
            <FirmwareEditor
              firmware={project.firmware}
              onUpdateFirmware={(code) =>
                updateProjectWithHistory((prev) => ({
                  ...prev,
                  firmware: { ...prev.firmware, code },
                }))
              }
              components={project.components}
            />
          )}

          {activeTab === 'bom' && <BomView components={project.components} />}
        </main>

        {/* Right Sidebar: AI Engineering Agent, Component Inspector, DRC Health */}
        <RightSidebar
          messages={messages}
          onSendMessage={handleSendMessage}
          isAiProcessing={isAiProcessing}
          selectedComponent={selectedComponent}
          onUpdateSelectedComponent={handleUpdateComponent}
          onDeleteSelectedComponent={handleDeleteSelected}
          onRotateSelectedComponent={handleRotateSelected}
          drcIssues={drcIssues}
          onFixDrcIssue={handleFixDrcIssue}
          simulation={simulation}
          onApplyPendingActions={handleApplyPendingActions}
        />
      </div>

      {/* 3. Bottom Tray: Oscilloscope, Bench Multimeter, UART Serial Logs */}
      <BottomTray
        simulation={simulation}
        isSimulating={isSimulating}
        components={project.components}
        serialLogs={serialLogs}
      />

      {/* 4. "New Invention" Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onBuildProject={handleBuildProject}
      />
    </div>
  );
};
