import { CanonicalProject, CircuitComponent, CircuitWire } from '../types';
import { createComponentInstance } from './componentDefinitions';

export function createEmptyProject(): CanonicalProject {
  return {
    id: `proj_${Date.now()}`,
    name: 'Clean Circuit Workspace',
    description: 'Empty schematic workspace ready for circuit design.',
    version: 1,
    components: [],
    wires: [],
    firmware: {
      target: 'arduino_uno',
      code: `// KITT AI Clean Workspace Firmware
void setup() {
  Serial.begin(115200);
  Serial.println("[KITT] Workspace clean and ready.");
}

void loop() {
  // Add your loop logic or ask KITT AI to synthesize circuits
  delay(100);
}`,
      isCompiled: false,
      compileLog: '',
      serialLogs: [],
    },
    architecture: [],
    viewMode: '2d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createTrafficLightProject(): CanonicalProject {
  const arduino = createComponentInstance('arduino_uno', 'U1', 'Arduino Uno R3', 180, 240, [-2.5, 0, 0]);
  
  const ledRed = createComponentInstance('led', 'D1', 'Red Stop LED', 450, 140, [1.5, 0.4, -1.2], {
    color: 'red',
    forwardVoltage: 1.9,
  });
  const resRed = createComponentInstance('resistor', 'R1', '220Ω Resistor', 340, 140, [0.4, 0.2, -1.2], {
    resistance: 220,
  });

  const ledYellow = createComponentInstance('led', 'D2', 'Yellow Caution LED', 450, 240, [1.5, 0.4, 0.0], {
    color: 'yellow',
    forwardVoltage: 2.1,
  });
  const resYellow = createComponentInstance('resistor', 'R2', '220Ω Resistor', 340, 240, [0.4, 0.2, 0.0], {
    resistance: 220,
  });

  const ledGreen = createComponentInstance('led', 'D3', 'Green Go LED', 450, 340, [1.5, 0.4, 1.2], {
    color: 'green',
    forwardVoltage: 2.2,
  });
  const resGreen = createComponentInstance('resistor', 'R3', '220Ω Resistor', 340, 340, [0.4, 0.2, 1.2], {
    resistance: 220,
  });

  const button = createComponentInstance('pushbutton', 'SW1', 'Pedestrian Crossing Button', 240, 420, [-0.6, 0.2, 2.0], {
    isPressed: false,
  });

  const components: CircuitComponent[] = [
    arduino,
    resRed,
    ledRed,
    resYellow,
    ledYellow,
    resGreen,
    ledGreen,
    button,
  ];

  const wires: CircuitWire[] = [
    // Arduino D12 -> R1 pin1 -> R1 pin2 -> Red LED Anode
    { id: 'w1', from: { componentId: arduino.id, pinId: 'D12' }, to: { componentId: resRed.id, pinId: 'pin1' }, color: '#ef4444' },
    { id: 'w2', from: { componentId: resRed.id, pinId: 'pin2' }, to: { componentId: ledRed.id, pinId: 'anode' }, color: '#ef4444' },

    // Arduino D11 -> R2 pin1 -> R2 pin2 -> Yellow LED Anode
    { id: 'w3', from: { componentId: arduino.id, pinId: 'D11' }, to: { componentId: resYellow.id, pinId: 'pin1' }, color: '#eab308' },
    { id: 'w4', from: { componentId: resYellow.id, pinId: 'pin2' }, to: { componentId: ledYellow.id, pinId: 'anode' }, color: '#eab308' },

    // Arduino D10 -> R3 pin1 -> R3 pin2 -> Green LED Anode
    { id: 'w5', from: { componentId: arduino.id, pinId: 'D10' }, to: { componentId: resGreen.id, pinId: 'pin1' }, color: '#22c55e' },
    { id: 'w6', from: { componentId: resGreen.id, pinId: 'pin2' }, to: { componentId: ledGreen.id, pinId: 'anode' }, color: '#22c55e' },

    // Common Ground Rail
    { id: 'w7', from: { componentId: ledRed.id, pinId: 'cathode' }, to: { componentId: arduino.id, pinId: 'GND_3' }, color: '#1e293b' },
    { id: 'w8', from: { componentId: ledYellow.id, pinId: 'cathode' }, to: { componentId: arduino.id, pinId: 'GND_3' }, color: '#1e293b' },
    { id: 'w9', from: { componentId: ledGreen.id, pinId: 'cathode' }, to: { componentId: arduino.id, pinId: 'GND_3' }, color: '#1e293b' },

    // Pedestrian Crossing Button (D2 with internal pullup to GND)
    { id: 'w10', from: { componentId: arduino.id, pinId: 'D2' }, to: { componentId: button.id, pinId: 'pin1' }, color: '#3b82f6' },
    { id: 'w11', from: { componentId: button.id, pinId: 'pin3' }, to: { componentId: arduino.id, pinId: 'GND_1' }, color: '#1e293b' },
  ];

  const firmwareCode = `// KITT AI Generated Firmware: Traffic Light Controller
// Hardware: Arduino Uno R3, 3x LEDs with 220R ballast, 1x Tactile Pedestrian Button

const int PIN_RED = 12;
const int PIN_YELLOW = 11;
const int PIN_GREEN = 10;
const int PIN_BUTTON = 2;

volatile bool pedestrianRequest = false;

void setup() {
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println("[KITT] Traffic Controller initialized.");
}

void loop() {
  // Check pedestrian request
  if (digitalRead(PIN_BUTTON) == LOW) {
    pedestrianRequest = true;
    Serial.println("[EVENT] Pedestrian button pressed!");
  }

  // GREEN LIGHT ON
  digitalWrite(PIN_RED, LOW);
  digitalWrite(PIN_YELLOW, LOW);
  digitalWrite(PIN_GREEN, HIGH);
  Serial.println("[STATE] Green Light ACTIVE (Go)");
  delay(pedestrianRequest ? 1500 : 4000);

  // YELLOW LIGHT ON
  digitalWrite(PIN_GREEN, LOW);
  digitalWrite(PIN_YELLOW, HIGH);
  Serial.println("[STATE] Yellow Light ACTIVE (Caution)");
  delay(1200);

  // RED LIGHT ON
  digitalWrite(PIN_YELLOW, LOW);
  digitalWrite(PIN_RED, HIGH);
  Serial.println("[STATE] Red Light ACTIVE (Stop)");
  delay(3500);
  
  pedestrianRequest = false;
}
`;

  return {
    id: 'proj_traffic_light',
    name: 'Smart Intersection Traffic Controller',
    description: 'Pedestrian-aware three-phase traffic light system with Arduino Uno, current-limiting resistors, and crossing request button.',
    version: 1,
    components,
    wires,
    firmware: {
      target: 'arduino_uno',
      code: firmwareCode,
      isCompiled: true,
      compileLog: 'Compilation successful. Sketch uses 1,942 bytes (6%) of program storage space.',
      serialLogs: [
        '[KITT] Traffic Controller initialized.',
        '[STATE] Green Light ACTIVE (Go)',
      ],
    },
    architecture: [
      {
        id: 'arch_mcu',
        name: 'Main Processing Unit',
        role: 'Timing state machine & I/O control',
        status: 'nominal',
        componentIds: [arduino.id],
        description: 'ATmega328P executing traffic loop and interrupt servicing.',
      },
      {
        id: 'arch_display',
        name: 'Optical Indicator Stage',
        role: 'Visual signaling to motorists',
        status: 'nominal',
        componentIds: [ledRed.id, ledYellow.id, ledGreen.id, resRed.id, resYellow.id, resGreen.id],
        description: 'Red (620nm), Amber (590nm), and Green (525nm) high-luminescence LEDs.',
      },
      {
        id: 'arch_input',
        name: 'Pedestrian Request Interface',
        role: 'Pedestrian demand registration',
        status: 'nominal',
        componentIds: [button.id],
        description: 'Momentary tactile switch pulling D2 to GND with internal pullup.',
      },
    ],
    viewMode: '3d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createPlantWateringProject(): CanonicalProject {
  const esp32 = createComponentInstance('esp32', 'U1', 'ESP32 NodeMCU', 200, 240, [-2.2, 0, 0]);

  const sensor = createComponentInstance('soil_sensor', 'SEN1', 'Soil Moisture Sensor', 480, 130, [1.8, 0.2, -1.5], {
    moisturePercent: 22, // Starts dry
    dryValue: 820,
    wetValue: 340,
  });

  const mosfet = createComponentInstance('mosfet', 'Q1', 'IRLZ44N Power MOSFET', 360, 310, [0.6, 0.3, 0.8], {
    vgsThreshold: 1.8,
    isConducting: true,
  });

  const pump = createComponentInstance('water_pump', 'M1', '5V Submersible Pump', 520, 310, [2.2, 0.4, 0.8], {
    isRunning: true,
    flowRateLph: 120,
  });

  const battery = createComponentInstance('battery', 'BAT1', '5V DC Power Rail', 200, 420, [-2.2, 0.2, 2.0], {
    nominalVoltage: 5.0,
  });

  const components: CircuitComponent[] = [
    esp32,
    sensor,
    mosfet,
    pump,
    battery,
  ];

  const wires: CircuitWire[] = [
    // Power rail distribution
    { id: 'pw1', from: { componentId: battery.id, pinId: 'vcc' }, to: { componentId: esp32.id, pinId: 'VIN' }, color: '#dc2626' },
    { id: 'pw2', from: { componentId: battery.id, pinId: 'gnd' }, to: { componentId: esp32.id, pinId: 'GND_1' }, color: '#1e293b' },

    // Sensor connections: 3V3, GND, AOUT -> GPIO34 (ADC)
    { id: 'sw1', from: { componentId: esp32.id, pinId: '3V3' }, to: { componentId: sensor.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'sw2', from: { componentId: esp32.id, pinId: 'GND_1' }, to: { componentId: sensor.id, pinId: 'GND' }, color: '#1e293b' },
    { id: 'sw3', from: { componentId: sensor.id, pinId: 'AOUT' }, to: { componentId: esp32.id, pinId: 'GPIO34' }, color: '#0284c7' },

    // MOSFET gate driven by GPIO26
    { id: 'mw1', from: { componentId: esp32.id, pinId: 'GPIO26' }, to: { componentId: mosfet.id, pinId: 'gate' }, color: '#a855f7' },
    { id: 'mw2', from: { componentId: mosfet.id, pinId: 'source' }, to: { componentId: esp32.id, pinId: 'GND_2' }, color: '#1e293b' },

    // Pump positive to 5V VIN, Pump negative to MOSFET Drain
    { id: 'mw3', from: { componentId: esp32.id, pinId: 'VIN' }, to: { componentId: pump.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'mw4', from: { componentId: pump.id, pinId: 'GND' }, to: { componentId: mosfet.id, pinId: 'drain' }, color: '#0f766e' },
  ];

  const firmwareCode = `// KITT AI Generated Firmware: Automatic Plant Irrigation Controller
// Board: ESP32 NodeMCU
// Peripherals: Capacitive Soil Moisture Sensor on ADC (GPIO34), IRLZ44N Gate on GPIO26

const int PIN_SOIL_ADC = 34;
const int PIN_PUMP_GATE = 26;

// Calibration constants
const int DRY_THRESHOLD_ADC = 600; // ADC values above 600 indicate dry soil (<30%)
const int SOIL_HYSTERESIS = 50;

void setup() {
  pinMode(PIN_PUMP_GATE, OUTPUT);
  digitalWrite(PIN_PUMP_GATE, LOW); // Start with pump off
  Serial.begin(115200);
  Serial.println("[KITT] ESP32 Smart Irrigation System booted.");
}

void loop() {
  int rawAdc = analogRead(PIN_SOIL_ADC);
  // Map ADC (340=100% moisture, 820=0% moisture)
  int moisturePercent = map(rawAdc, 820, 340, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  Serial.print("[SENSOR] Soil moisture: ");
  Serial.print(moisturePercent);
  Serial.print("% (ADC: ");
  Serial.print(rawAdc);
  Serial.println(")");

  if (rawAdc > DRY_THRESHOLD_ADC) {
    // Soil is DRY: Engage irrigation pump
    digitalWrite(PIN_PUMP_GATE, HIGH);
    Serial.println("[PUMP] STATUS: ENGAGED (Irrigating)");
  } else if (rawAdc < (DRY_THRESHOLD_ADC - SOIL_HYSTERESIS)) {
    // Soil is adequately hydrated
    digitalWrite(PIN_PUMP_GATE, LOW);
    Serial.println("[PUMP] STATUS: IDLE (Soil hydrated)");
  }

  delay(1000);
}
`;

  return {
    id: 'proj_plant_watering',
    name: 'Autonomous IoT Plant Watering System',
    description: 'ESP32-based automated closed-loop soil hydration monitor with capacitive sensor and logic-level MOSFET pump driver.',
    version: 1,
    components,
    wires,
    firmware: {
      target: 'esp32',
      code: firmwareCode,
      isCompiled: true,
      compileLog: 'ESP32 compilation completed. Flash: 221,800 bytes, RAM: 14,840 bytes.',
      serialLogs: [
        '[KITT] ESP32 Smart Irrigation System booted.',
        '[SENSOR] Soil moisture: 22% (ADC: 710)',
        '[PUMP] STATUS: ENGAGED (Irrigating)',
      ],
    },
    architecture: [
      {
        id: 'arch_power',
        name: 'Power Regulation Subsystem',
        role: 'Regulates 5V supply to ESP32 & Pump',
        status: 'nominal',
        componentIds: [battery.id],
        description: 'Primary 5V DC supply rail with common ground reference.',
      },
      {
        id: 'arch_sensing',
        name: 'Environmental Sensing Stage',
        role: 'Capacitive dielectric soil hydration acquisition',
        status: 'nominal',
        componentIds: [sensor.id],
        description: 'Corrosion-proof analog capacitive transducer on GPIO34 (ADC1_CH6).',
      },
      {
        id: 'arch_control',
        name: 'Compute & Control Core',
        role: 'ADC sampling, hysteresis thresholding, gate PWM',
        status: 'nominal',
        componentIds: [esp32.id],
        description: 'Xtensa 32-bit dual-core processor executing irrigation logic.',
      },
      {
        id: 'arch_actuator',
        name: 'High-Current Pump Driver',
        role: 'Low-side switching for 5V water pump',
        status: 'active',
        componentIds: [mosfet.id, pump.id],
        description: 'IRLZ44N logic-level N-MOSFET switching ground return for submersible pump.',
      },
    ],
    viewMode: '3d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const TRAFFIC_LIGHT_PROJECT: CanonicalProject = createTrafficLightProject();
export const PLANT_WATERING_PROJECT: CanonicalProject = createPlantWateringProject();

export function createLogicGateProject(): CanonicalProject {
  const switchA = createComponentInstance('logic_switch', 'SW_A', 'Input Switch A', 140, 170, [-2.2, 0.2, -1.0], {
    state: 1, // Start with A=1
  });

  const switchB = createComponentInstance('logic_switch', 'SW_B', 'Input Switch B', 140, 330, [-2.2, 0.2, 1.0], {
    state: 0, // Start with B=0
  });

  const xorGate = createComponentInstance('xor_gate', 'U_XOR', 'XOR Gate (Sum)', 400, 170, [0.0, 0.3, -1.0]);

  const andGate = createComponentInstance('and_gate', 'U_AND', 'AND Gate (Carry)', 400, 330, [0.0, 0.3, 1.0]);

  const probeSum = createComponentInstance('logic_probe', 'P_SUM', 'Sum Probe (S)', 650, 170, [2.4, 0.2, -1.0], {
    value: 1,
  });

  const probeCarry = createComponentInstance('logic_probe', 'P_CARRY', 'Carry Probe (C)', 650, 330, [2.4, 0.2, 1.0], {
    value: 0,
  });

  const components: CircuitComponent[] = [
    switchA,
    switchB,
    xorGate,
    andGate,
    probeSum,
    probeCarry,
  ];

  const wires: CircuitWire[] = [
    // Switch A -> XOR in_a & AND in_a
    { id: 'w_a_xor', from: { componentId: switchA.id, pinId: 'out' }, to: { componentId: xorGate.id, pinId: 'in_a' }, color: '#38bdf8' },
    { id: 'w_a_and', from: { componentId: switchA.id, pinId: 'out' }, to: { componentId: andGate.id, pinId: 'in_a' }, color: '#38bdf8' },

    // Switch B -> XOR in_b & AND in_b
    { id: 'w_b_xor', from: { componentId: switchB.id, pinId: 'out' }, to: { componentId: xorGate.id, pinId: 'in_b' }, color: '#f59e0b' },
    { id: 'w_b_and', from: { componentId: switchB.id, pinId: 'out' }, to: { componentId: andGate.id, pinId: 'in_b' }, color: '#f59e0b' },

    // XOR out_y -> Sum Probe
    { id: 'w_xor_sum', from: { componentId: xorGate.id, pinId: 'out_y' }, to: { componentId: probeSum.id, pinId: 'in' }, color: '#10b981' },

    // AND out_y -> Carry Probe
    { id: 'w_and_carry', from: { componentId: andGate.id, pinId: 'out_y' }, to: { componentId: probeCarry.id, pinId: 'in' }, color: '#a855f7' },
  ];

  return {
    id: 'proj_logic_gates',
    name: 'Digital Half-Adder (ANSI/IEEE Gates)',
    description: 'Hardware logic gate synthesizer implementing a 1-bit binary Half Adder with standard ANSI/IEEE distinctive gate symbols: XOR for Sum and AND for Carry.',
    components,
    wires,
    firmware: {
      target: 'arduino_uno',
      code: `// Digital Logic Gate Truth Table Simulator
// Half-Adder:
// A=0, B=0 => SUM=0, CARRY=0
// A=0, B=1 => SUM=1, CARRY=0
// A=1, B=0 => SUM=1, CARRY=0
// A=1, B=1 => SUM=0, CARRY=1

void setup() {
  Serial.begin(115200);
  Serial.println("[LOGIC CORE] ANSI/IEEE Digital Gate Simulation Active");
}

void loop() {
  // Combinational propagation runs deterministically in real time
  delay(100);
}`,
      isCompiled: true,
      compileLog: 'Digital Logic Core compiled successfully: 0 warnings, 0 errors.',
      serialLogs: ['[LOGIC CORE] ANSI/IEEE Digital Gate Simulation Active'],
    },
    version: 1,
    architecture: [
      {
        id: 'arch_inputs',
        name: 'Digital Input Conditioning',
        role: 'Dual SPDT Binary Logic Switches (A & B)',
        status: 'nominal',
        componentIds: [switchA.id, switchB.id],
        description: 'Produces clean 0V (LOW) and 5V (HIGH) logic levels with zero bounce.',
      },
      {
        id: 'arch_sum',
        name: 'Binary Sum Computation',
        role: 'Modulo-2 Addition (XOR: S = A ⊕ B)',
        status: 'active',
        componentIds: [xorGate.id, probeSum.id],
        description: 'SN74LS86 Quad XOR computing single-bit arithmetic sum.',
      },
      {
        id: 'arch_carry',
        name: 'Carry Bit Generation',
        role: 'Arithmetic Carry Output (AND: C = A · B)',
        status: 'active',
        componentIds: [andGate.id, probeCarry.id],
        description: 'SN74LS08 Quad AND gate asserting carry-out on dual-high inputs.',
      },
    ],
    viewMode: '2d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const LOGIC_GATE_PROJECT: CanonicalProject = createLogicGateProject();

