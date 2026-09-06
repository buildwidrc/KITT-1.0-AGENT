export type ComponentCategory =
  | 'mcu'
  | 'basic'
  | 'input'
  | 'sensor'
  | 'output'
  | 'power'
  | 'prototyping';

export type ComponentType =
  | 'arduino_uno'
  | 'esp32'
  | 'led'
  | 'resistor'
  | 'pushbutton'
  | 'soil_sensor'
  | 'water_pump'
  | 'mosfet'
  | 'potentiometer'
  | 'buzzer'
  | 'battery'
  | 'breadboard';

export type PinType = 'digital' | 'analog' | 'vcc' | 'gnd' | 'pwm' | 'gpio';

export interface PinDefinition {
  id: string;
  name: string;
  type: PinType;
  x2d: number; // relative to component center
  y2d: number;
  x3d: number; // relative 3D coordinate
  y3d: number;
  z3d: number;
  breadboardTiePoint?: string; // e.g. "row-15-a"
}

export interface CircuitComponent {
  id: string;
  name: string;
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  x2d: number;
  y2d: number;
  rotation2d: number; // 0, 90, 180, 270
  position3d: [number, number, number];
  rotation3d: [number, number, number];
  breadboardSnap?: {
    row: number;
    col: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'vcc' | 'gnd';
  };
  properties: Record<string, any>; // e.g. resistance: 220, color: 'red', threshold: 450, moistureLevel: 30, buttonPressed: false
  pins: PinDefinition[];
}

export interface WireEndpoint {
  componentId: string;
  pinId: string;
}

export interface CircuitWire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  color: string; // hex or name (e.g. #ef4444, #3b82f6)
  waypoints2d?: Array<{ x: number; y: number }>;
}

export interface CircuitNet {
  id: string;
  name: string;
  wireIds: string[];
  voltage?: number;
  state?: 'HIGH' | 'LOW' | 'FLOATING' | 'PWM';
}

export interface DrcIssue {
  id: string;
  type?: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  componentId?: string;
  pinId?: string;
  netId?: string;
  suggestedFix?: string;
  fixAction?: AIAction;
}

export interface SimulationMeasurement {
  timeMs: number;
  channel1Voltage: number;
  channel2Voltage: number;
  totalCurrentMa: number;
  pinVoltages: Record<string, number>; // key: `${componentId}.${pinId}`
  pinStates: Record<string, 'HIGH' | 'LOW' | 'FLOATING'>;
  componentStates: Record<string, any>;
}

export interface FirmwareProject {
  target: 'arduino_uno' | 'esp32';
  code: string;
  isCompiled: boolean;
  compileLog: string;
  serialLogs: string[];
}

export interface SubsystemBlock {
  id: string;
  name: string;
  role: string;
  status: 'nominal' | 'active' | 'standby' | 'alert';
  componentIds: string[];
  description: string;
}

export type ViewMode = '2d' | '3d';

export interface CanonicalProject {
  id: string;
  name: string;
  description: string;
  version: number;
  components: CircuitComponent[];
  wires: CircuitWire[];
  firmware: FirmwareProject;
  architecture: SubsystemBlock[];
  viewMode: ViewMode;
  createdAt: string;
  updatedAt: string;
}

export type KittProject = CanonicalProject;

export interface AIAction {
  type:
    | 'create_component'
    | 'delete_component'
    | 'move_component'
    | 'connect_pins'
    | 'disconnect_pins'
    | 'set_property'
    | 'generate_firmware'
    | 'modify_subsystem'
    | 'fix_error';
  payload: any;
  description: string;
}

export interface AIPlanStep {
  title: string;
  detail: string;
  completed: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  plan?: AIPlanStep[];
  plannedActions?: AIAction[];
  status?: 'planning' | 'pending_confirmation' | 'executing' | 'done' | 'applied' | 'error';
}

export interface VirtualInstrumentsState {
  multimeter: {
    enabled: boolean;
    mode: 'V' | 'mA' | 'Ω' | 'CONT';
    probeRed: WireEndpoint | null;
    probeBlack: WireEndpoint | null;
    reading: number;
    unit: string;
  };
  oscilloscope: {
    enabled: boolean;
    channel1Probe: WireEndpoint | null;
    channel2Probe: WireEndpoint | null;
    timeBaseMs: number; // e.g. 100ms / div
    voltsPerDivCh1: number;
    voltsPerDivCh2: number;
    isPaused: boolean;
  };
  powerSupply: {
    outputEnabled: boolean;
    voltageSetting: number; // 5.0V
    currentLimitMa: number; // 500mA
    actualVoltage: number;
    actualCurrentMa: number;
  };
}
