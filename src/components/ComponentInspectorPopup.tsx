import React, { useState } from 'react';
import {
  X,
  Zap,
  Cpu,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Trash2,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { CircuitComponent, SimulationMeasurement, ViewMode } from '../types';
import { COMPONENT_CATALOG } from '../data/componentDefinitions';

interface ComponentInspectorPopupProps {
  component: CircuitComponent;
  simulation: SimulationMeasurement | null;
  isSimulating: boolean;
  onClose: () => void;
  onUpdateComponent: (updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onAskAiQuestion: (question: string) => void;
  viewMode: ViewMode;
}

interface AutoQuery {
  id: string;
  question: string;
  quickAnswer: string;
}

export const ComponentInspectorPopup: React.FC<ComponentInspectorPopupProps> = ({
  component,
  simulation,
  isSimulating,
  onClose,
  onUpdateComponent,
  onDeleteComponent,
  onAskAiQuestion,
  viewMode,
}) => {
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const meta = COMPONENT_CATALOG[component.type] || {
    name: component.name,
    label: component.label,
    category: component.category,
    description: '',
    pins: component.pins,
    colorHex: '#3b82f6',
  };

  const compState = simulation?.componentStates[component.id];

  // Derive pin voltages
  const pinReadings = component.pins.map((pin) => {
    const v = simulation?.pinVoltages[`${component.id}.${pin.id}`];
    const isHigh = v !== undefined && v >= 2.0;
    const isLow = v !== undefined && v < 0.8;
    return {
      pin,
      voltage: v !== undefined ? v : null,
      isHigh,
      isLow,
    };
  });

  // Generate dynamic queries based on component type and current readings
  const getAutoQueries = (): AutoQuery[] => {
    switch (component.type) {
      case 'and_gate': {
        const outVolt = simulation?.pinVoltages[`${component.id}.out_y`] ?? 0;
        const inAVolt = simulation?.pinVoltages[`${component.id}.in_a`] ?? 0;
        const inBVolt = simulation?.pinVoltages[`${component.id}.in_b`] ?? 0;
        const isOutHigh = outVolt >= 2.0;

        return [
          {
            id: 'and_state',
            question: `Why is Output Y currently ${isOutHigh ? 'HIGH (5V)' : 'LOW (0V)'}?`,
            quickAnswer: `In Boolean logic, an AND gate evaluates Y = A · B. The output is HIGH only when both Input A and Input B are ≥2.0V simultaneously. Currently: Input A = ${inAVolt.toFixed(1)}V, Input B = ${inBVolt.toFixed(1)}V, resulting in Y = ${isOutHigh ? '1' : '0'}.`,
          },
          {
            id: 'and_ttl_spec',
            question: 'What are the voltage thresholds and propagation delay of the 74LS08?',
            quickAnswer:
              'The Texas Instruments SN74LS08 TTL gate defines V_IL max = 0.8V and V_IH min = 2.0V. Typical propagation delay is 9 ns from input transition to output assertion.',
          },
          {
            id: 'and_floating',
            question: 'What happens if one of the AND gate inputs is left floating?',
            quickAnswer:
              'In classic TTL bipolar logic, an open/floating pin tends to drift HIGH due to internal emitter pull-ups, but it is vulnerable to EMI noise. Inputs should always be tied to a defined rail or pull-up/pull-down resistor.',
          },
          {
            id: 'and_half_adder',
            question: 'How is this AND gate used in an arithmetic Half-Adder?',
            quickAnswer:
              'In a 1-bit binary adder, the Carry bit is produced by Carry = A · B (using this AND gate), while the Sum bit is computed by an XOR gate (Sum = A ⊕ B).',
          },
        ];
      }

      case 'or_gate': {
        const inAVolt = simulation?.pinVoltages[`${component.id}.in_a`] ?? 0;
        const inBVolt = simulation?.pinVoltages[`${component.id}.in_b`] ?? 0;
        const outVolt = simulation?.pinVoltages[`${component.id}.out_y`] ?? 0;
        return [
          {
            id: 'or_state',
            question: `Why is the OR output currently ${outVolt >= 2.0 ? 'HIGH (1)' : 'LOW (0)'}?`,
            quickAnswer: `An OR gate evaluates Y = A + B. The output goes HIGH if either Input A (${inAVolt.toFixed(1)}V) or Input B (${inBVolt.toFixed(1)}V) is pulled HIGH.`,
          },
          {
            id: 'or_demorgan',
            question: "How can this OR gate be synthesized using NAND gates (De Morgan's)?",
            quickAnswer:
              "According to De Morgan's theorem, A + B = ¬(¬A · ¬B). Invert inputs A and B using NAND inverters, then pass both inverted signals into a third NAND gate.",
          },
          {
            id: 'or_power',
            question: 'What is the current consumption of the SN74LS32 IC?',
            quickAnswer:
              'Typical quiescent supply current I_CC for the 74LS32 package is approximately 9.8 mA with outputs LOW and 4.9 mA with outputs HIGH.',
          },
        ];
      }

      case 'xor_gate': {
        const inAVolt = simulation?.pinVoltages[`${component.id}.in_a`] ?? 0;
        const inBVolt = simulation?.pinVoltages[`${component.id}.in_b`] ?? 0;
        const outVolt = simulation?.pinVoltages[`${component.id}.out_y`] ?? 0;
        return [
          {
            id: 'xor_logic',
            question: `How is XOR evaluated for inputs A=${inAVolt >= 2 ? '1' : '0'} and B=${inBVolt >= 2 ? '1' : '0'}?`,
            quickAnswer: `Exclusive-OR evaluates Y = A ⊕ B = (A · ¬B) + (¬A · B). It yields 1 when the inputs differ and 0 when both are identical. Currently Output Y is ${outVolt >= 2.0 ? 'HIGH [1]' : 'LOW [0]'}.`,
          },
          {
            id: 'xor_parity',
            question: 'How is an XOR gate used for parity checking in data communications?',
            quickAnswer:
              'Cascading XOR gates computes the Modulo-2 sum of bits. An odd number of 1-bits results in a 1 output, functioning as an instantaneous hardware parity bit generator.',
          },
          {
            id: 'xor_inverter',
            question: 'How does tying one XOR input to VCC turn it into a programmable inverter?',
            quickAnswer:
              'Because A ⊕ 1 = ¬A, holding one input HIGH turns the XOR gate into a clean NOT inverter. Holding it LOW (A ⊕ 0 = A) turns it into a non-inverting buffer.',
          },
        ];
      }

      case 'not_gate': {
        const inAVolt = simulation?.pinVoltages[`${component.id}.in_a`] ?? 0;
        return [
          {
            id: 'not_state',
            question: `What is the inverter output for Input = ${inAVolt.toFixed(1)}V?`,
            quickAnswer: `The NOT gate inverts the logic state: Output Y = ¬A. An input of ${inAVolt >= 2.0 ? 'HIGH (1)' : 'LOW (0)'} produces an output of ${inAVolt >= 2.0 ? 'LOW (0V)' : 'HIGH (5V)'}.`,
          },
          {
            id: 'not_ring_osc',
            question: 'Can NOT gates be used to build a clock ring oscillator?',
            quickAnswer:
              'Yes! Connecting an odd number of inverters in a ring (e.g. 3 or 5 stages) produces an astable multivibrator oscillation with frequency f = 1 / (2 · N · t_pd).',
          },
        ];
      }

      case 'nand_gate':
      case 'nor_gate':
      case 'xnor_gate': {
        return [
          {
            id: 'univ_logic',
            question: 'Why is this gate classified as a "Universal Logic" building block?',
            quickAnswer:
              'Universal gates (NAND and NOR) can emulate any basic logic operation (AND, OR, NOT, XOR, Flip-Flops) through algebraic combinations, forming the basis of standard cell libraries in digital VLSI.',
          },
          {
            id: 'gate_truth_table',
            question: 'What is the complete truth table for this 2-input gate?',
            quickAnswer:
              component.type === 'nand_gate'
                ? '(0,0)→1, (0,1)→1, (1,0)→1, (1,1)→0'
                : component.type === 'nor_gate'
                ? '(0,0)→1, (0,1)→0, (1,0)→0, (1,1)→0'
                : '(0,0)→1, (0,1)→0, (1,0)→0, (1,1)→1',
          },
        ];
      }

      case 'logic_switch': {
        const isClosed = component.properties?.state === 1 || component.properties?.state === true;
        return [
          {
            id: 'sw_toggle',
            question: `The switch is currently in state [${isClosed ? '1 - HIGH' : '0 - LOW'}]. How does it affect downstream gates?`,
            quickAnswer: `When set to 1 (HIGH), the switch applies 5.0V to its output terminal. When set to 0 (LOW), it connects directly to 0.0V (GND). All connected gate inputs propagate this change instantly.`,
          },
          {
            id: 'sw_debounce',
            question: 'Why do physical mechanical switches require debouncing in real circuits?',
            quickAnswer:
              'Real mechanical spring contacts bounce rapidly for 2 to 20 milliseconds during actuation, generating dozens of false digital clock edges without RC filtering or software debounce delays.',
          },
        ];
      }

      case 'led': {
        const isLit = compState?.state === 'on' || (simulation?.pinVoltages[`${component.id}.anode`] ?? 0) > 2.0;
        const color = component.properties?.color || 'red';
        const vf = color === 'red' ? 1.9 : color === 'yellow' ? 2.1 : color === 'green' ? 2.2 : 3.2;

        return [
          {
            id: 'led_bias',
            question: `Is this ${color.toUpperCase()} LED forward biased and illuminated?`,
            quickAnswer: `Status: ${isLit ? 'ILLUMINATED' : 'OFF'}. A standard ${color} LED has a forward voltage drop of ~${vf}V. Current flow from Anode to Cathode must be restricted to between 10mA and 20mA.`,
          },
          {
            id: 'led_resistor_calc',
            question: 'How do I calculate the correct ballast resistor for this LED?',
            quickAnswer: `Use Ohm\'s Law: R = (V_supply - V_f) / I_f. For a 5V supply, V_f = ${vf}V, and target current 15mA: R = (5.0 - ${vf}) / 0.015 = ${Math.round((5 - vf) / 0.015)} Ω (nearest standard value: 220Ω).`,
          },
          {
            id: 'led_reverse',
            question: 'What happens if this LED is connected in reverse polarity?',
            quickAnswer:
              'In reverse bias, the P-N junction does not conduct below the reverse breakdown voltage (typically 5V for standard LEDs). No current flows, and the LED remains dark.',
          },
        ];
      }

      case 'resistor': {
        const rVal = component.properties?.resistance || 220;
        const v1 = simulation?.pinVoltages[`${component.id}.pin1`] ?? 5.0;
        const v2 = simulation?.pinVoltages[`${component.id}.pin2`] ?? 2.1;
        const vDrop = Math.abs(v1 - v2);
        const currentMa = rVal > 0 ? (vDrop / rVal) * 1000 : 0;
        const powerMw = (vDrop * currentMa);

        return [
          {
            id: 'res_power',
            question: `What is the current and power dissipation in this ${rVal}Ω resistor?`,
            quickAnswer: `Voltage drop: ${vDrop.toFixed(2)}V. Current: I = V/R = ${currentMa.toFixed(1)} mA. Power: P = V · I = ${powerMw.toFixed(1)} mW. Rated for 250 mW (1/4W), running well within safe thermal limits.`,
          },
          {
            id: 'res_color_code',
            question: `What is the 4-band color code for ${rVal}Ω?`,
            quickAnswer:
              rVal === 220
                ? 'Red (2) - Red (2) - Brown (x10) - Gold (±5%)'
                : rVal === 330
                ? 'Orange (3) - Orange (3) - Brown (x10) - Gold (±5%)'
                : rVal === 10000
                ? 'Brown (1) - Black (0) - Orange (x1k) - Gold (±5%)'
                : `Digits correspond to EIA-96 standard color bands for ${rVal} ohms.`,
          },
          {
            id: 'res_pullup',
            question: 'How do pull-up vs pull-down resistors prevent floating digital inputs?',
            quickAnswer:
              'A pull-up resistor (typically 4.7kΩ - 10kΩ) connects a signal line to VCC, ensuring a default HIGH state when the line is idle. A pull-down connects to GND, ensuring default LOW.',
          },
        ];
      }

      case 'arduino_uno': {
        return [
          {
            id: 'mcu_pwm',
            question: 'Which pins on Arduino Uno support hardware PWM output?',
            quickAnswer:
              'Pins D3, D5, D6, D9, D10, and D11 support 8-bit analogWrite() PWM. Pins 5 and 6 operate at ~980 Hz; pins 3, 9, 10, 11 operate at ~490 Hz.',
          },
          {
            id: 'mcu_limits',
            question: 'What are the maximum current limits for the ATmega328P pins?',
            quickAnswer:
              'Maximum absolute rating is 40 mA per I/O pin (recommended continuous operation ≤20 mA). The total current through all pins combined must not exceed 200 mA.',
          },
          {
            id: 'mcu_firmware',
            question: 'What firmware routine is currently executing on this board?',
            quickAnswer:
              'The microcontroller runs the compiled C++ state machine shown in the Firmware tab. All digital outputs and input reads update on each simulation tick.',
          },
        ];
      }

      case 'esp32': {
        return [
          {
            id: 'esp_logic_level',
            question: 'Is the ESP32 5V tolerant on its GPIO inputs?',
            quickAnswer:
              'No. The ESP32 is strictly a 3.3V LVCMOS device. Connecting 5V signals directly to its GPIO pins risks dielectric breakdown of the gate oxide. Use level shifters or voltage dividers.',
          },
          {
            id: 'esp_adc',
            question: 'Which ESP32 pins are recommended for analog sensor inputs?',
            quickAnswer:
              'Use ADC1 channels (GPIO 32, 33, 34, 35, 36, 39). ADC2 channels are multiplexed with the Wi-Fi radio subsystem and cannot be read while Wi-Fi is actively transmitting.',
          },
        ];
      }

      case 'soil_sensor': {
        return [
          {
            id: 'sensor_principle',
            question: 'How does capacitive soil moisture sensing differ from resistive probes?',
            quickAnswer:
              'Capacitive sensors measure soil dielectric permittivity without exposed metal traces, completely avoiding the rapid electrolysis and corrosion that destroys resistive probes.',
          },
          {
            id: 'sensor_adc_calib',
            question: 'How to calibrate the analog reading for dry vs saturated soil?',
            quickAnswer:
              'Measure sensor output in open air (~3.0V / ADC ~850 = 0% moisture) and in a cup of water (~1.2V / ADC ~350 = 100% moisture). Map linear interpolation between these thresholds.',
          },
        ];
      }

      case 'water_pump':
      case 'mosfet': {
        return [
          {
            id: 'pump_driver',
            question: 'Why is an N-channel power MOSFET needed to drive this pump?',
            quickAnswer:
              'The 5V DC motor draws 250mA-500mA, far exceeding microcontroller pin capacity (20mA). An IRLZ44N logic-level MOSFET switches the high current with low R_DS(on) (<0.02Ω).',
          },
          {
            id: 'pump_flyback',
            question: 'Why must a flyback diode be placed across the motor terminals?',
            quickAnswer:
              'When the motor is switched off, collapsing magnetic inductance generates a high reverse voltage spike (V = L·di/dt). A 1N4007 or Schottky diode safely clamps this spike to protect the transistor.',
          },
        ];
      }

      default:
        return [
          {
            id: 'general_telemetry',
            question: `How is this ${component.name} integrated into the circuit?`,
            quickAnswer: `It has ${component.pins.length} active connection pins. Check the pin telemetry below to monitor instantaneous voltages and logic states.`,
          },
        ];
    }
  };

  const queries = getAutoQueries();

  // Helper for quick logic switch toggle
  const handleToggleLogicSwitch = () => {
    const cur = component.properties?.state === 1 || component.properties?.state === true ? 1 : 0;
    const next = cur === 1 ? 0 : 1;
    onUpdateComponent({
      properties: {
        ...component.properties,
        state: next,
        voltage: next === 1 ? 5.0 : 0.0,
      },
    });
  };

  // Helper for resistance step
  const handleSetResistance = (r: number) => {
    onUpdateComponent({
      properties: {
        ...component.properties,
        resistance: r,
      },
    });
  };

  return (
    <div
      className="absolute bottom-4 right-4 z-40 w-96 max-h-[85vh] flex flex-col bg-[#0f131d]/95 backdrop-blur-xl border border-[#2b354b] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header with Component Title & Controls */}
      <div className="px-4 py-3 bg-[#151a26] border-b border-[#263147] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-400">
            {component.category === 'logic' ? (
              <Zap className="w-4 h-4 text-emerald-400" />
            ) : component.category === 'mcu' ? (
              <Cpu className="w-4 h-4 text-cyan-400" />
            ) : (
              <Activity className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate">{component.name}</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-violet-950 text-violet-300 rounded border border-violet-800/60">
                {component.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <span>{meta.category.toUpperCase()}</span>
              <span>•</span>
              <span className="text-slate-300">
                {viewMode === '2d' ? '2D Schematic Symbol' : '3D Physical Model'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-[#202737] rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={isMinimized ? 'Expand Inspector' : 'Minimize Inspector'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onUpdateComponent({ rotation2d: (component.rotation2d + 90) % 360 })}
            className="p-1 hover:bg-[#202737] rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteComponent(component.id)}
            className="p-1 hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-400 transition-colors"
            title="Delete Component"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#202737] rounded text-slate-400 hover:text-white transition-colors ml-1"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="overflow-y-auto max-h-[calc(85vh-56px)] p-3 space-y-3.5 divide-y divide-[#1e2536]">
          {/* 2. Interactive Direct Component Controls (if applicable) */}
          {component.type === 'logic_switch' && (
            <div className="pt-1 pb-1">
              <div className="p-2.5 bg-[#121622] rounded-lg border border-[#232c40] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-200">Logic State Output</div>
                  <div className="text-[10px] text-slate-400">
                    {component.properties?.state === 1 ? 'Output connected to +5.0V VCC' : 'Output connected to 0.0V GND'}
                  </div>
                </div>
                <button
                  onClick={handleToggleLogicSwitch}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                    component.properties?.state === 1
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {component.properties?.state === 1 ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-200" />
                      <span>[1] HIGH</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                      <span>[0] LOW</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {component.type === 'pushbutton' && (
            <div className="pt-1 pb-1">
              <div className="p-2.5 bg-[#121622] rounded-lg border border-[#232c40] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-200">Momentary Contact</div>
                  <div className="text-[10px] text-slate-400">
                    {component.properties?.isPressed ? 'Contacts CLOSED (Pushed)' : 'Contacts OPEN (Normal)'}
                  </div>
                </div>
                <button
                  onMouseDown={() =>
                    onUpdateComponent({ properties: { ...component.properties, isPressed: true } })
                  }
                  onMouseUp={() =>
                    onUpdateComponent({ properties: { ...component.properties, isPressed: false } })
                  }
                  className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    component.properties?.isPressed
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {component.properties?.isPressed ? 'PRESSED' : 'HOLD TO PRESS'}
                </button>
              </div>
            </div>
          )}

          {component.type === 'resistor' && (
            <div className="pt-2 pb-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Resistance Setting:</span>
                <span className="font-mono font-bold text-amber-400">
                  {component.properties?.resistance ?? 220} Ω
                </span>
              </div>
              <div className="flex gap-1.5">
                {[100, 220, 330, 1000, 10000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSetResistance(val)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
                      component.properties?.resistance === val
                        ? 'bg-amber-600/30 border-amber-500/60 text-amber-300 font-bold'
                        : 'bg-[#151a24] border-[#252e40] text-slate-400 hover:bg-[#1f2636]'
                    }`}
                  >
                    {val >= 1000 ? `${val / 1000}k` : `${val}Ω`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Live Pin Telemetry & Measurement Grid */}
          <div className="pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Live Pin Telemetry
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {isSimulating ? '● Running' : '○ Standby'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {pinReadings.map(({ pin, voltage, isHigh, isLow }) => {
                let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
                let stateLabel = '0.0V';

                if (voltage !== null) {
                  stateLabel = `${voltage.toFixed(2)}V`;
                  if (isHigh) {
                    badgeBg = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50';
                  } else if (isLow) {
                    badgeBg = 'bg-sky-950/60 text-sky-300 border-sky-700/50';
                  } else {
                    badgeBg = 'bg-amber-950/60 text-amber-300 border-amber-700/50';
                  }
                }

                return (
                  <div
                    key={pin.id}
                    className="p-1.5 px-2.5 bg-[#121622] hover:bg-[#181d2c] rounded border border-[#212a3d] flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isHigh
                            ? 'bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse'
                            : isLow
                            ? 'bg-slate-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      <span className="font-mono text-[11px] text-slate-200 font-medium">
                        {pin.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">({pin.type})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeBg}`}>
                        {stateLabel}
                      </span>
                      {isHigh && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono font-semibold">
                          HIGH
                        </span>
                      )}
                      {isLow && voltage !== null && (
                        <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                          LOW
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Auto-Generated Questions & AI Queries */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                Auto-Generated Queries & Q&A
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded font-mono">
                Click to Ask
              </span>
            </div>

            <div className="space-y-2">
              {queries.map((q) => {
                const isExpanded = expandedQueryId === q.id;
                return (
                  <div
                    key={q.id}
                    className="p-2.5 bg-[#121622] hover:bg-[#171c2b] border border-[#232c40] hover:border-violet-500/40 rounded-lg transition-all space-y-2"
                  >
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedQueryId(isExpanded ? null : q.id)}
                    >
                      <div className="text-[11px] text-slate-200 font-medium leading-tight hover:text-violet-300 transition-colors">
                        {q.question}
                      </div>
                      <div className="shrink-0 text-slate-400 pt-0.5">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-violet-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-[#1f2738] space-y-2 animate-in fade-in duration-150">
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-[#0c0e14] p-2 rounded border border-[#1b2230]">
                          {q.quickAnswer}
                        </p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => onAskAiQuestion(q.question)}
                            className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Ask KITT AI Co-Pilot</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
