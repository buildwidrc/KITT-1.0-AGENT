import React, { useState, useRef, useEffect } from 'react';
import {
  CircuitComponent,
  CircuitWire,
  SimulationMeasurement,
  WireEndpoint,
} from '../types';
import { COMPONENT_CATALOG } from '../data/componentDefinitions';
import { RotateCw, Trash2, Zap, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Schematic2DCanvasProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (from: WireEndpoint, to: WireEndpoint, color?: string) => void;
  onDeleteWire: (wireId: string) => void;
  simulation: SimulationMeasurement | null;
  isSimulating: boolean;
}

export const Schematic2DCanvas: React.FC<Schematic2DCanvasProps> = ({
  components,
  wires,
  selectedComponentId,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
  simulation,
  isSimulating,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 80, y: 50 });
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Component Dragging
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring state: click pin to start, hover over pin, click to finish
  const [wiringStart, setWiringStart] = useState<{
    componentId: string;
    pinId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.5);
    setZoom(newZoom);
  };

  // Convert client coordinates to canvas world coordinates
  const clientToWorld = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+Click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      onSelectComponent(null);
      if (wiringStart) setWiringStart(null);
      // Background drag panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = clientToWorld(e.clientX, e.clientY);
    setMousePos(worldPos);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingCompId) {
      // Snap to 10px grid
      const snappedX = Math.round((worldPos.x - dragOffset.x) / 10) * 10;
      const snappedY = Math.round((worldPos.y - dragOffset.y) / 10) * 10;
      onUpdateComponent(draggingCompId, { x2d: snappedX, y2d: snappedY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
  };

  // Rotate selected component
  const rotateSelected = () => {
    if (!selectedComponentId) return;
    const comp = components.find((c) => c.id === selectedComponentId);
    if (!comp) return;
    const newRotation = (comp.rotation2d + 90) % 360;
    onUpdateComponent(selectedComponentId, { rotation2d: newRotation });
  };

  // Helper to find exact pin world coordinate
  const getPinCoordinate = (componentId: string, pinId: string) => {
    const comp = components.find((c) => c.id === componentId);
    if (!comp) return { x: 0, y: 0 };
    const pin = comp.pins.find((p) => p.id === pinId);
    if (!pin) return { x: comp.x2d, y: comp.y2d };

    // Apply rotation
    const rad = (comp.rotation2d * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotatedX = pin.x2d * cos - pin.y2d * sin;
    const rotatedY = pin.x2d * sin + pin.y2d * cos;

    return {
      x: comp.x2d + rotatedX,
      y: comp.y2d + rotatedY,
    };
  };

  // Wire click logic
  const handlePinClick = (e: React.MouseEvent, componentId: string, pinId: string) => {
    e.stopPropagation();
    const pinCoord = getPinCoordinate(componentId, pinId);

    if (!wiringStart) {
      // Start wire
      setWiringStart({ componentId, pinId, x: pinCoord.x, y: pinCoord.y });
    } else {
      // Complete wire
      if (wiringStart.componentId !== componentId || wiringStart.pinId !== pinId) {
        // Auto color code wire based on pin type
        const comp = components.find((c) => c.id === componentId);
        const pin = comp?.pins.find((p) => p.id === pinId);
        let wireColor = '#06b6d4'; // default cyan
        if (pin?.type === 'vcc' || pinId === '5V' || pinId === 'VIN' || pinId === 'anode') wireColor = '#ef4444';
        else if (pin?.type === 'gnd' || pinId.includes('GND') || pinId === 'cathode') wireColor = '#1e293b';
        else if (pin?.type === 'pwm') wireColor = '#a855f7';
        else if (pin?.type === 'analog') wireColor = '#3b82f6';

        onAddWire(
          { componentId: wiringStart.componentId, pinId: wiringStart.pinId },
          { componentId, pinId },
          wireColor
        );
      }
      setWiringStart(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full bg-[#0d1017] overflow-hidden select-none cursor-crosshair"
    >
      {/* 2D Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[#161b24]/90 backdrop-blur p-1 rounded-lg border border-[#262f40] shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 2.5))}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#202736] rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.4))}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#202736] rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setPan({ x: 100, y: 80 });
            setZoom(1.0);
          }}
          title="Reset View"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#202736] rounded transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-[#262f40] mx-1" />
        <span className="text-[11px] font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>

        {selectedComponentId && (
          <>
            <div className="h-4 w-px bg-[#262f40] mx-1" />
            <button
              onClick={rotateSelected}
              title="Rotate Component 90° (R)"
              className="flex items-center gap-1 px-2 py-1 bg-[#202736] hover:bg-[#2b3548] text-violet-300 text-xs font-mono rounded transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
            <button
              onClick={() => onDeleteComponent(selectedComponentId)}
              title="Delete Selected (Del)"
              className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Wiring in progress indicator banner */}
      {wiringStart && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-violet-600/90 text-white rounded-md text-xs font-mono shadow-lg border border-violet-400/30 animate-pulse">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Click target terminal to complete wire (Esc to cancel)</span>
        </div>
      )}

      {/* Main SVG Schematic Board */}
      <svg className="w-full h-full">
        <defs>
          {/* Engineering Dot Grid Pattern */}
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#202736" />
          </pattern>
          {/* Component Drop Shadow */}
          <filter id="compShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Pan and Zoom Transformation Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Dot Grid Background */}
          <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#dotGrid)" />

          {/* Render Electrical Wires */}
          {wires.map((wire) => {
            const start = getPinCoordinate(wire.from.componentId, wire.from.pinId);
            const end = getPinCoordinate(wire.to.componentId, wire.to.pinId);

            // Orthogonal dogleg routing
            const midX = start.x + (end.x - start.x) / 2;
            const pathData = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;

            return (
              <g key={wire.id} className="group cursor-pointer">
                {/* Wider invisible hit area for deletion */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this wire connection?')) {
                      onDeleteWire(wire.id);
                    }
                  }}
                />
                {/* Outer halo */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
                {/* Core highlight */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray={isSimulating ? '4 4' : 'none'}
                  className={isSimulating ? 'animate-[dash_1s_linear_infinite]' : ''}
                  opacity="0.4"
                />
                {/* Connection Junction Dots */}
                <circle cx={start.x} cy={start.y} r="3.5" fill={wire.color} />
                <circle cx={end.x} cy={end.y} r="3.5" fill={wire.color} />
              </g>
            );
          })}

          {/* Active Rubber-band Wire while dragging */}
          {wiringStart && (
            <g>
              <line
                x1={wiringStart.x}
                y1={wiringStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#a855f7"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              <circle cx={wiringStart.x} cy={wiringStart.y} r="4" fill="#a855f7" />
              <circle cx={mousePos.x} cy={mousePos.y} r="3" fill="#c084fc" />
            </g>
          )}

          {/* Render Schematic Components */}
          {components.map((comp) => {
            const isSelected = selectedComponentId === comp.id;
            const meta = COMPONENT_CATALOG[comp.type];
            const compState = simulation?.componentStates[comp.id];

            return (
              <g
                key={comp.id}
                transform={`translate(${comp.x2d}, ${comp.y2d}) rotate(${comp.rotation2d})`}
                className="select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                }}
                onMouseDown={(e) => {
                  if (e.button === 0 && !wiringStart) {
                    e.stopPropagation();
                    onSelectComponent(comp.id);
                    setDraggingCompId(comp.id);
                    const worldPos = clientToWorld(e.clientX, e.clientY);
                    setDragOffset({ x: worldPos.x - comp.x2d, y: worldPos.y - comp.y2d });
                  }
                }}
              >
                {/* Component Body Box with Engineering Styling */}
                <rect
                  x={-meta.width2d / 2}
                  y={-meta.height2d / 2}
                  width={meta.width2d}
                  height={meta.height2d}
                  rx="6"
                  fill={isSelected ? '#1f2737' : '#141822'}
                  stroke={isSelected ? '#8b5cf6' : '#2b3548'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  filter="url(#compShadow)"
                  className="transition-colors cursor-move"
                />

                {/* Specific Schematic Symbol Graphic */}
                {comp.type === 'led' && (
                  <g transform="translate(-10, -10)">
                    {/* Diode Triangle */}
                    <polygon
                      points="0,0 20,10 0,20"
                      fill={compState?.state === 'on' ? (comp.properties.color === 'red' ? '#ef4444' : comp.properties.color === 'yellow' ? '#eab308' : '#22c55e') : '#334155'}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <line x1="20" y1="0" x2="20" y2="20" stroke="#94a3b8" strokeWidth="2" />
                    {/* Light emission arrows */}
                    {compState?.state === 'on' && (
                      <g stroke={comp.properties.color === 'red' ? '#f87171' : '#4ade80'} strokeWidth="1.5">
                        <line x1="14" y1="-2" x2="22" y2="-8" />
                        <line x1="8" y1="-2" x2="16" y2="-8" />
                      </g>
                    )}
                  </g>
                )}

                {comp.type === 'resistor' && (
                  <g transform="translate(-20, 0)">
                    {/* Resistor zigzag symbol */}
                    <path
                      d="M 0 0 L 6 -8 L 14 8 L 22 -8 L 30 8 L 36 0 L 40 0"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {comp.type === 'pushbutton' && (
                  <g transform="translate(0, 0)">
                    <circle cx="0" cy="0" r="14" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="8" fill={comp.properties.isPressed ? '#ef4444' : '#475569'} />
                  </g>
                )}

                {comp.type === 'soil_sensor' && (
                  <g transform="translate(-15, 0)">
                    <rect x="0" y="-15" width="30" height="40" rx="3" fill="#166534" stroke="#22c55e" strokeWidth="1" />
                    <line x1="6" y1="10" x2="6" y2="25" stroke="#facc15" strokeWidth="2" />
                    <line x1="15" y1="10" x2="15" y2="25" stroke="#facc15" strokeWidth="2" />
                    <line x1="24" y1="10" x2="24" y2="25" stroke="#facc15" strokeWidth="2" />
                  </g>
                )}

                {comp.type === 'water_pump' && (
                  <g transform="translate(0, 0)">
                    <circle cx="0" cy="0" r="16" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
                    <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">M</text>
                    {compState?.isRunning && (
                      <circle cx="0" cy="0" r="20" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" className="animate-spin" />
                    )}
                  </g>
                )}

                {/* Component Label and Type */}
                <text
                  x="0"
                  y={meta.height2d / 2 - 8}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontWeight="600"
                  className="font-mono pointer-events-none"
                >
                  {comp.name}
                </text>

                <text
                  x="0"
                  y={-meta.height2d / 2 + 14}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="500"
                  className="font-mono pointer-events-none"
                >
                  {comp.label}
                </text>

                {/* Render Component Pins / Terminals */}
                {comp.pins.map((pin) => {
                  const pinVoltage = simulation?.pinVoltages[`${comp.id}.${pin.id}`];
                  const pinState = simulation?.pinStates[`${comp.id}.${pin.id}`];

                  let pinColor = '#94a3b8';
                  if (pin.type === 'vcc' || pin.id.includes('5V') || pin.id === 'VIN') pinColor = '#ef4444';
                  else if (pin.type === 'gnd' || pin.id.includes('GND')) pinColor = '#1e293b';
                  else if (pin.type === 'pwm') pinColor = '#c084fc';
                  else if (pin.type === 'analog') pinColor = '#38bdf8';

                  return (
                    <g
                      key={pin.id}
                      transform={`translate(${pin.x2d}, ${pin.y2d})`}
                      onClick={(e) => handlePinClick(e, comp.id, pin.id)}
                      className="cursor-pointer group/pin"
                    >
                      {/* Terminal Circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r="5"
                        fill="#0f172a"
                        stroke={pinColor}
                        strokeWidth="2"
                        className="group-hover/pin:r-6 group-hover/pin:fill-violet-600 transition-all"
                      />

                      {/* Voltage telemetry tag when simulating */}
                      {isSimulating && pinVoltage !== undefined && (
                        <g transform="translate(8, -4)">
                          <rect
                            x="-2"
                            y="-8"
                            width="28"
                            height="11"
                            rx="2"
                            fill="#0b0f17"
                            stroke="#334155"
                            strokeWidth="0.5"
                          />
                          <text
                            x="12"
                            y="0"
                            textAnchor="middle"
                            fill={pinVoltage > 2.0 ? '#4ade80' : '#94a3b8'}
                            fontSize="7"
                            fontWeight="bold"
                            className="font-mono"
                          >
                            {pinVoltage.toFixed(1)}V
                          </text>
                        </g>
                      )}

                      {/* Pin Label */}
                      <text
                        x={pin.x2d < 0 ? 8 : -8}
                        y="3"
                        textAnchor={pin.x2d < 0 ? 'start' : 'end'}
                        fill="#cbd5e1"
                        fontSize="8"
                        className="font-mono pointer-events-none group-hover/pin:fill-white font-semibold"
                      >
                        {pin.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
