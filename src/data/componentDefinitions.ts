import { CircuitComponent, ComponentType, PinDefinition } from '../types';

export interface ComponentMetadata {
  type: ComponentType;
  name: string;
  category: 'mcu' | 'basic' | 'input' | 'sensor' | 'output' | 'power' | 'prototyping';
  description: string;
  defaultProperties: Record<string, any>;
  pins: PinDefinition[];
  width2d: number;
  height2d: number;
  size3d: [number, number, number]; // [width, height, depth]
  colorHex: string;
}

export const COMPONENT_CATALOG: Record<ComponentType, ComponentMetadata> = {
  arduino_uno: {
    type: 'arduino_uno',
    name: 'Arduino Uno R3',
    category: 'mcu',
    description: 'ATmega328P microcontroller board with 14 digital I/O pins and 6 analog inputs.',
    defaultProperties: {
      firmwareTarget: 'arduino_uno',
      clockMhz: 16,
      powerState: 'on',
    },
    pins: [
      { id: '5V', name: '5V', type: 'vcc', x2d: -50, y2d: 40, x3d: -1.2, y3d: 0.2, z3d: 0.8 },
      { id: '3V3', name: '3.3V', type: 'vcc', x2d: -50, y2d: 55, x3d: -1.2, y3d: 0.2, z3d: 1.0 },
      { id: 'GND_1', name: 'GND', type: 'gnd', x2d: -50, y2d: 70, x3d: -1.2, y3d: 0.2, z3d: 1.2 },
      { id: 'GND_2', name: 'GND', type: 'gnd', x2d: -50, y2d: 85, x3d: -1.2, y3d: 0.2, z3d: 1.4 },
      { id: 'VIN', name: 'VIN', type: 'vcc', x2d: -50, y2d: 100, x3d: -1.2, y3d: 0.2, z3d: 1.6 },
      { id: 'A0', name: 'A0', type: 'analog', x2d: -50, y2d: -40, x3d: -1.2, y3d: 0.2, z3d: -0.8 },
      { id: 'A1', name: 'A1', type: 'analog', x2d: -50, y2d: -25, x3d: -1.2, y3d: 0.2, z3d: -0.6 },
      { id: 'A2', name: 'A2', type: 'analog', x2d: -50, y2d: -10, x3d: -1.2, y3d: 0.2, z3d: -0.4 },
      { id: 'A3', name: 'A3', type: 'analog', x2d: -50, y2d: 5, x3d: -1.2, y3d: 0.2, z3d: -0.2 },
      { id: 'D2', name: 'D2', type: 'digital', x2d: 50, y2d: -40, x3d: 1.2, y3d: 0.2, z3d: -0.8 },
      { id: 'D3', name: 'D3~', type: 'pwm', x2d: 50, y2d: -25, x3d: 1.2, y3d: 0.2, z3d: -0.6 },
      { id: 'D4', name: 'D4', type: 'digital', x2d: 50, y2d: -10, x3d: 1.2, y3d: 0.2, z3d: -0.4 },
      { id: 'D5', name: 'D5~', type: 'pwm', x2d: 50, y2d: 5, x3d: 1.2, y3d: 0.2, z3d: -0.2 },
      { id: 'D6', name: 'D6~', type: 'pwm', x2d: 50, y2d: 20, x3d: 1.2, y3d: 0.2, z3d: 0.0 },
      { id: 'D7', name: 'D7', type: 'digital', x2d: 50, y2d: 35, x3d: 1.2, y3d: 0.2, z3d: 0.2 },
      { id: 'D8', name: 'D8', type: 'digital', x2d: 50, y2d: 50, x3d: 1.2, y3d: 0.2, z3d: 0.4 },
      { id: 'D9', name: 'D9~', type: 'pwm', x2d: 50, y2d: 65, x3d: 1.2, y3d: 0.2, z3d: 0.6 },
      { id: 'D10', name: 'D10~', type: 'pwm', x2d: 50, y2d: 80, x3d: 1.2, y3d: 0.2, z3d: 0.8 },
      { id: 'D11', name: 'D11~', type: 'pwm', x2d: 50, y2d: 95, x3d: 1.2, y3d: 0.2, z3d: 1.0 },
      { id: 'D12', name: 'D12', type: 'digital', x2d: 50, y2d: 110, x3d: 1.2, y3d: 0.2, z3d: 1.2 },
      { id: 'D13', name: 'D13', type: 'digital', x2d: 50, y2d: 125, x3d: 1.2, y3d: 0.2, z3d: 1.4 },
      { id: 'GND_3', name: 'GND', type: 'gnd', x2d: 50, y2d: 140, x3d: 1.2, y3d: 0.2, z3d: 1.6 },
    ],
    width2d: 120,
    height2d: 190,
    size3d: [2.6, 0.4, 3.8],
    colorHex: '#00878F',
  },
  esp32: {
    type: 'esp32',
    name: 'ESP32 NodeMCU',
    category: 'mcu',
    description: '32-bit dual-core Wi-Fi & Bluetooth microcontroller with capacitive touch and ADC channels.',
    defaultProperties: {
      firmwareTarget: 'esp32',
      wifiConnected: true,
      rssi: -58,
    },
    pins: [
      { id: '3V3', name: '3V3', type: 'vcc', x2d: -45, y2d: -50, x3d: -0.9, y3d: 0.2, z3d: -1.2 },
      { id: 'GND_1', name: 'GND', type: 'gnd', x2d: -45, y2d: -30, x3d: -0.9, y3d: 0.2, z3d: -0.8 },
      { id: 'GPIO34', name: 'IO34 (ADC)', type: 'analog', x2d: -45, y2d: -10, x3d: -0.9, y3d: 0.2, z3d: -0.4 },
      { id: 'GPIO35', name: 'IO35 (ADC)', type: 'analog', x2d: -45, y2d: 10, x3d: -0.9, y3d: 0.2, z3d: 0.0 },
      { id: 'GPIO32', name: 'IO32', type: 'gpio', x2d: -45, y2d: 30, x3d: -0.9, y3d: 0.2, z3d: 0.4 },
      { id: 'GPIO33', name: 'IO33', type: 'gpio', x2d: -45, y2d: 50, x3d: -0.9, y3d: 0.2, z3d: 0.8 },
      { id: 'GPIO25', name: 'IO25', type: 'gpio', x2d: 45, y2d: -50, x3d: 0.9, y3d: 0.2, z3d: -1.2 },
      { id: 'GPIO26', name: 'IO26 (PWM)', type: 'pwm', x2d: 45, y2d: -30, x3d: 0.9, y3d: 0.2, z3d: -0.8 },
      { id: 'GPIO27', name: 'IO27', type: 'gpio', x2d: 45, y2d: -10, x3d: 0.9, y3d: 0.2, z3d: -0.4 },
      { id: 'GPIO14', name: 'IO14', type: 'gpio', x2d: 45, y2d: 10, x3d: 0.9, y3d: 0.2, z3d: 0.0 },
      { id: 'GPIO12', name: 'IO12', type: 'gpio', x2d: 45, y2d: 30, x3d: 0.9, y3d: 0.2, z3d: 0.4 },
      { id: 'GND_2', name: 'GND', type: 'gnd', x2d: 45, y2d: 50, x3d: 0.9, y3d: 0.2, z3d: 0.8 },
      { id: 'VIN', name: '5V VIN', type: 'vcc', x2d: 45, y2d: 70, x3d: 0.9, y3d: 0.2, z3d: 1.2 },
    ],
    width2d: 110,
    height2d: 160,
    size3d: [2.0, 0.35, 3.4],
    colorHex: '#1e293b',
  },
  led: {
    type: 'led',
    name: 'LED (5mm)',
    category: 'output',
    description: 'Standard 5mm Light Emitting Diode with forward voltage drop 1.8V - 3.2V.',
    defaultProperties: {
      color: 'green',
      forwardVoltage: 2.1,
      maxCurrentMa: 20,
      state: 'off',
      brightness: 0,
    },
    pins: [
      { id: 'anode', name: 'Anode (+)', type: 'digital', x2d: -20, y2d: 0, x3d: -0.2, y3d: 0.5, z3d: 0 },
      { id: 'cathode', name: 'Cathode (-)', type: 'gnd', x2d: 20, y2d: 0, x3d: 0.2, y3d: 0.4, z3d: 0 },
    ],
    width2d: 60,
    height2d: 50,
    size3d: [0.6, 1.0, 0.6],
    colorHex: '#22c55e',
  },
  resistor: {
    type: 'resistor',
    name: 'Resistor (1/4W)',
    category: 'basic',
    description: 'Carbon film through-hole resistor to limit current and set biasing voltages.',
    defaultProperties: {
      resistance: 220,
      unit: 'Ω',
      tolerance: 5,
    },
    pins: [
      { id: 'pin1', name: 'Pin 1', type: 'gpio', x2d: -25, y2d: 0, x3d: -0.6, y3d: 0.2, z3d: 0 },
      { id: 'pin2', name: 'Pin 2', type: 'gpio', x2d: 25, y2d: 0, x3d: 0.6, y3d: 0.2, z3d: 0 },
    ],
    width2d: 70,
    height2d: 30,
    size3d: [1.4, 0.3, 0.3],
    colorHex: '#d97706',
  },
  pushbutton: {
    type: 'pushbutton',
    name: 'Tactile Push Button',
    category: 'input',
    description: 'Momentary 6x6mm micro pushbutton switch with tactile feedback.',
    defaultProperties: {
      isPressed: false,
      pullMode: 'pullup',
    },
    pins: [
      { id: 'pin1', name: 'Term 1A', type: 'gpio', x2d: -20, y2d: -15, x3d: -0.4, y3d: 0.2, z3d: -0.4 },
      { id: 'pin2', name: 'Term 1B', type: 'gpio', x2d: -20, y2d: 15, x3d: -0.4, y3d: 0.2, z3d: 0.4 },
      { id: 'pin3', name: 'Term 2A', type: 'gpio', x2d: 20, y2d: -15, x3d: 0.4, y3d: 0.2, z3d: -0.4 },
      { id: 'pin4', name: 'Term 2B', type: 'gpio', x2d: 20, y2d: 15, x3d: 0.4, y3d: 0.2, z3d: 0.4 },
    ],
    width2d: 55,
    height2d: 55,
    size3d: [0.9, 0.5, 0.9],
    colorHex: '#475569',
  },
  soil_sensor: {
    type: 'soil_sensor',
    name: 'Capacitive Soil Moisture Sensor v1.2',
    category: 'sensor',
    description: 'Corrosion-resistant soil moisture sensor providing analog voltage proportional to soil humidity.',
    defaultProperties: {
      moisturePercent: 25,
      dryValue: 820,
      wetValue: 340,
      simulatedAdc: 690,
    },
    pins: [
      { id: 'VCC', name: 'VCC (3.3V-5V)', type: 'vcc', x2d: -25, y2d: -30, x3d: -0.3, y3d: 0.2, z3d: -0.8 },
      { id: 'GND', name: 'GND', type: 'gnd', x2d: 0, y2d: -30, x3d: 0.0, y3d: 0.2, z3d: -0.8 },
      { id: 'AOUT', name: 'AOUT', type: 'analog', x2d: 25, y2d: -30, x3d: 0.3, y3d: 0.2, z3d: -0.8 },
    ],
    width2d: 70,
    height2d: 110,
    size3d: [0.8, 0.2, 2.2],
    colorHex: '#166534',
  },
  water_pump: {
    type: 'water_pump',
    name: 'Submersible 5V Water Pump',
    category: 'output',
    description: 'Mini DC 3V-5V submersible electric water pump for irrigation and dispensing.',
    defaultProperties: {
      isRunning: false,
      flowRateLph: 120,
      activeCurrentMa: 180,
    },
    pins: [
      { id: 'VCC', name: 'V+ (Motor)', type: 'vcc', x2d: -20, y2d: 0, x3d: -0.3, y3d: 0.3, z3d: 0 },
      { id: 'GND', name: 'V- (Return)', type: 'gnd', x2d: 20, y2d: 0, x3d: 0.3, y3d: 0.3, z3d: 0 },
    ],
    width2d: 80,
    height2d: 65,
    size3d: [1.6, 1.4, 1.6],
    colorHex: '#0284c7',
  },
  mosfet: {
    type: 'mosfet',
    name: 'IRLZ44N Logic N-MOSFET',
    category: 'basic',
    description: 'Logic-level N-Channel Power MOSFET capable of driving high current motors/pumps from a 3.3V or 5V MCU pin.',
    defaultProperties: {
      vgsThreshold: 1.8,
      rdsOnMilliOhm: 22,
      isConducting: false,
    },
    pins: [
      { id: 'gate', name: 'Gate (G)', type: 'digital', x2d: -25, y2d: 20, x3d: -0.3, y3d: 0.2, z3d: 0 },
      { id: 'drain', name: 'Drain (D)', type: 'gpio', x2d: 0, y2d: 20, x3d: 0.0, y3d: 0.2, z3d: 0 },
      { id: 'source', name: 'Source (S)', type: 'gnd', x2d: 25, y2d: 20, x3d: 0.3, y3d: 0.2, z3d: 0 },
    ],
    width2d: 65,
    height2d: 60,
    size3d: [1.0, 1.2, 0.4],
    colorHex: '#334155',
  },
  potentiometer: {
    type: 'potentiometer',
    name: 'Rotary Potentiometer (10k)',
    category: 'input',
    description: 'Variable voltage divider for manual analog input calibration and tuning.',
    defaultProperties: {
      positionPercent: 50,
      maxResistance: 10000,
    },
    pins: [
      { id: 'pin1', name: 'VCC (1)', type: 'vcc', x2d: -25, y2d: 20, x3d: -0.4, y3d: 0.3, z3d: 0 },
      { id: 'wiper', name: 'Wiper (2)', type: 'analog', x2d: 0, y2d: 20, x3d: 0.0, y3d: 0.3, z3d: 0 },
      { id: 'pin3', name: 'GND (3)', type: 'gnd', x2d: 25, y2d: 20, x3d: 0.4, y3d: 0.3, z3d: 0 },
    ],
    width2d: 60,
    height2d: 60,
    size3d: [1.1, 0.8, 1.1],
    colorHex: '#0891b2',
  },
  buzzer: {
    type: 'buzzer',
    name: 'Piezo Buzzer (5V)',
    category: 'output',
    description: 'Active 5V acoustic sounder for alarms and tone indications.',
    defaultProperties: {
      frequencyHz: 2700,
      isSounding: false,
    },
    pins: [
      { id: 'pos', name: '+ (Signal)', type: 'digital', x2d: -15, y2d: 0, x3d: -0.3, y3d: 0.3, z3d: 0 },
      { id: 'neg', name: '- (GND)', type: 'gnd', x2d: 15, y2d: 0, x3d: 0.3, y3d: 0.3, z3d: 0 },
    ],
    width2d: 55,
    height2d: 55,
    size3d: [1.0, 0.7, 1.0],
    colorHex: '#1e293b',
  },
  battery: {
    type: 'battery',
    name: 'Battery Pack (5V / 4xAA)',
    category: 'power',
    description: 'DC Power Source providing clean regulated supply rail.',
    defaultProperties: {
      nominalVoltage: 5.0,
      capacityMah: 2000,
      stateOfCharge: 95,
    },
    pins: [
      { id: 'vcc', name: 'VCC (+)', type: 'vcc', x2d: -25, y2d: 0, x3d: -0.6, y3d: 0.3, z3d: 0 },
      { id: 'gnd', name: 'GND (-)', type: 'gnd', x2d: 25, y2d: 0, x3d: 0.6, y3d: 0.3, z3d: 0 },
    ],
    width2d: 90,
    height2d: 50,
    size3d: [2.2, 0.8, 1.4],
    colorHex: '#b45309',
  },
  breadboard: {
    type: 'breadboard',
    name: 'Solderless Breadboard (830 Point)',
    category: 'prototyping',
    description: 'Full-size prototyping board with double power distribution rails and 63 terminal rows.',
    defaultProperties: {
      rows: 63,
      tiePoints: 830,
    },
    pins: [],
    width2d: 280,
    height2d: 160,
    size3d: [7.2, 0.3, 3.2],
    colorHex: '#f8fafc',
  },
};

export function createComponentInstance(
  type: ComponentType,
  name: string,
  label: string,
  x2d: number,
  y2d: number,
  position3d: [number, number, number],
  customProps: Record<string, any> = {}
): CircuitComponent {
  const meta = COMPONENT_CATALOG[type];
  return {
    id: `comp_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name,
    type,
    label,
    category: meta.category,
    x2d,
    y2d,
    rotation2d: 0,
    position3d,
    rotation3d: [0, 0, 0],
    properties: { ...meta.defaultProperties, ...customProps },
    pins: JSON.parse(JSON.stringify(meta.pins)),
  };
}
