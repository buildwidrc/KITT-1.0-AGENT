import { CanonicalProject, DrcIssue, SimulationMeasurement } from '../types';

export interface SimulationInputs {
  buttonStates: Record<string, boolean>; // compId -> isPressed
  soilMoistureOverrides: Record<string, number>; // compId -> percent (0-100)
  potentiometerPositions: Record<string, number>; // compId -> percent (0-100)
}

export function runSimulationStep(
  project: CanonicalProject,
  elapsedMs: number,
  inputs: SimulationInputs
): { measurement: SimulationMeasurement; drcIssues: DrcIssue[] } {
  const pinVoltages: Record<string, number> = {};
  const pinStates: Record<string, 'HIGH' | 'LOW' | 'FLOATING'> = {};
  const componentStates: Record<string, any> = {};
  const drcIssues: DrcIssue[] = [];

  let totalCurrentMa = 15; // Base microcontroller quiescent current (mA)

  // 1. Initialize power and ground rails from MCU or Battery
  project.components.forEach((comp) => {
    if (comp.type === 'arduino_uno') {
      pinVoltages[`${comp.id}.5V`] = 5.0;
      pinVoltages[`${comp.id}.3V3`] = 3.3;
      pinVoltages[`${comp.id}.VIN`] = 5.0;
      pinVoltages[`${comp.id}.GND_1`] = 0.0;
      pinVoltages[`${comp.id}.GND_2`] = 0.0;
      pinVoltages[`${comp.id}.GND_3`] = 0.0;

      pinStates[`${comp.id}.5V`] = 'HIGH';
      pinStates[`${comp.id}.3V3`] = 'HIGH';
      pinStates[`${comp.id}.GND_1`] = 'LOW';
      pinStates[`${comp.id}.GND_2`] = 'LOW';
      pinStates[`${comp.id}.GND_3`] = 'LOW';
    } else if (comp.type === 'esp32') {
      pinVoltages[`${comp.id}.3V3`] = 3.3;
      pinVoltages[`${comp.id}.VIN`] = 5.0;
      pinVoltages[`${comp.id}.GND_1`] = 0.0;
      pinVoltages[`${comp.id}.GND_2`] = 0.0;

      pinStates[`${comp.id}.3V3`] = 'HIGH';
      pinStates[`${comp.id}.GND_1`] = 'LOW';
      pinStates[`${comp.id}.GND_2`] = 'LOW';
    } else if (comp.type === 'battery') {
      const vNominal = comp.properties.nominalVoltage || 5.0;
      pinVoltages[`${comp.id}.vcc`] = vNominal;
      pinVoltages[`${comp.id}.gnd`] = 0.0;
      pinStates[`${comp.id}.vcc`] = 'HIGH';
      pinStates[`${comp.id}.gnd`] = 'LOW';
    }
  });

  // 2. Propagate power rails along connected wires
  project.wires.forEach((wire) => {
    const fromKey = `${wire.from.componentId}.${wire.from.pinId}`;
    const toKey = `${wire.to.componentId}.${wire.to.pinId}`;

    if (pinVoltages[fromKey] !== undefined && pinVoltages[toKey] === undefined) {
      pinVoltages[toKey] = pinVoltages[fromKey];
      pinStates[toKey] = pinStates[fromKey];
    } else if (pinVoltages[toKey] !== undefined && pinVoltages[fromKey] === undefined) {
      pinVoltages[fromKey] = pinVoltages[toKey];
      pinStates[fromKey] = pinStates[toKey];
    }
  });

  // 3. Evaluate MCU Logic & Firmware State Machine
  const projectId = project?.id || '';
  const isTrafficProject =
    projectId.includes('traffic') ||
    (project?.components || []).some(
      (c) => (c?.name || '').includes('Traffic') || (c?.label || '').includes('Stop')
    );
  const isPlantProject =
    projectId.includes('plant') ||
    (project?.components || []).some((c) => c?.type === 'soil_sensor' || c?.type === 'water_pump');

  if (isTrafficProject) {
    // Check pedestrian button
    const buttonComp = project.components.find((c) => c.type === 'pushbutton');
    const isButtonPressed = buttonComp ? (inputs.buttonStates[buttonComp.id] ?? false) : false;

    // Traffic light cycle: Green -> Yellow -> Red
    // Cycle length: 8000ms
    const cycleTime = elapsedMs % 8000;
    let redActive = false;
    let yellowActive = false;
    let greenActive = false;

    if (isButtonPressed) {
      // Rapid switch to red if pedestrian pushed crossing button
      redActive = true;
    } else if (cycleTime < 3500) {
      greenActive = true;
    } else if (cycleTime < 4800) {
      yellowActive = true;
    } else {
      redActive = true;
    }

    const arduino = project.components.find((c) => c.type === 'arduino_uno');
    if (arduino) {
      pinVoltages[`${arduino.id}.D12`] = redActive ? 5.0 : 0.0;
      pinVoltages[`${arduino.id}.D11`] = yellowActive ? 5.0 : 0.0;
      pinVoltages[`${arduino.id}.D10`] = greenActive ? 5.0 : 0.0;
      pinVoltages[`${arduino.id}.D2`] = isButtonPressed ? 0.0 : 5.0; // Pullup behavior

      pinStates[`${arduino.id}.D12`] = redActive ? 'HIGH' : 'LOW';
      pinStates[`${arduino.id}.D11`] = yellowActive ? 'HIGH' : 'LOW';
      pinStates[`${arduino.id}.D10`] = greenActive ? 'HIGH' : 'LOW';
      pinStates[`${arduino.id}.D2`] = isButtonPressed ? 'LOW' : 'HIGH';
    }

    // Propagate D12, D11, D10 to respective resistors and LEDs
    project.components.forEach((comp) => {
      if (comp.type === 'led') {
        const color = comp.properties.color || 'red';
        const isOn =
          (color === 'red' && redActive) ||
          (color === 'yellow' && yellowActive) ||
          (color === 'green' && greenActive);

        // Check if resistor exists in line
        const hasResistor = project.components.some(
          (c) => c.type === 'resistor' && Math.abs(c.y2d - comp.y2d) < 40
        );

        if (isOn) {
          const currentMa = hasResistor ? 13.2 : 45.0;
          totalCurrentMa += currentMa;
          componentStates[comp.id] = { state: 'on', brightness: 1.0, currentMa };
          pinVoltages[`${comp.id}.anode`] = 2.1;
          pinVoltages[`${comp.id}.cathode`] = 0.0;

          if (!hasResistor) {
            drcIssues.push({
              id: `drc_overcurrent_${comp.id}`,
              severity: 'error',
              title: `Excessive Current on ${comp.label}`,
              description: `LED is connected without a current-limiting resistor. Forward current is ${currentMa.toFixed(1)}mA (Max rating: 20mA). Risk of component failure!`,
              componentId: comp.id,
              suggestedFix: 'Add a 220Ω or 330Ω resistor in series with the anode.',
            });
          }
        } else {
          componentStates[comp.id] = { state: 'off', brightness: 0.0, currentMa: 0 };
          pinVoltages[`${comp.id}.anode`] = 0.0;
          pinVoltages[`${comp.id}.cathode`] = 0.0;
        }
      }
    });
  } else if (isPlantProject) {
    const sensorComp = project.components.find((c) => c.type === 'soil_sensor');
    const pumpComp = project.components.find((c) => c.type === 'water_pump');
    const mosfetComp = project.components.find((c) => c.type === 'mosfet');
    const esp32 = project.components.find((c) => c.type === 'esp32');

    const moisture = sensorComp
      ? (inputs.soilMoistureOverrides[sensorComp.id] ?? sensorComp.properties.moisturePercent ?? 22)
      : 22;

    // Soil sensor ADC mapping: 100% moisture -> 1.1V (wet), 0% moisture -> 2.8V (dry)
    const sensorVoltage = 2.8 - (moisture / 100) * 1.7;
    const isSoilDry = moisture < 35;

    if (sensorComp) {
      pinVoltages[`${sensorComp.id}.VCC`] = 3.3;
      pinVoltages[`${sensorComp.id}.GND`] = 0.0;
      pinVoltages[`${sensorComp.id}.AOUT`] = Number(sensorVoltage.toFixed(2));
      componentStates[sensorComp.id] = {
        moisturePercent: moisture,
        outputVoltage: sensorVoltage,
        status: isSoilDry ? 'Soil is DRY' : 'Soil is OPTIMAL',
      };
    }

    if (esp32) {
      pinVoltages[`${esp32.id}.GPIO34`] = Number(sensorVoltage.toFixed(2));
      pinVoltages[`${esp32.id}.GPIO26`] = isSoilDry ? 3.3 : 0.0;
      pinStates[`${esp32.id}.GPIO26`] = isSoilDry ? 'HIGH' : 'LOW';
    }

    if (mosfetComp) {
      const gateVoltage = isSoilDry ? 3.3 : 0.0;
      const isConducting = gateVoltage >= 1.8;
      pinVoltages[`${mosfetComp.id}.gate`] = gateVoltage;
      pinVoltages[`${mosfetComp.id}.source`] = 0.0;
      pinVoltages[`${mosfetComp.id}.drain`] = isConducting ? 0.04 : 5.0;
      componentStates[mosfetComp.id] = {
        isConducting,
        vgs: gateVoltage,
        channelResistance: isConducting ? 0.022 : 1e6,
      };

      if (pumpComp) {
        if (isConducting) {
          const pumpCurrentMa = 185;
          totalCurrentMa += pumpCurrentMa;
          pinVoltages[`${pumpComp.id}.VCC`] = 5.0;
          pinVoltages[`${pumpComp.id}.GND`] = 0.04;
          componentStates[pumpComp.id] = {
            isRunning: true,
            rpm: 3600,
            flowRateLph: 120,
            activeCurrentMa: pumpCurrentMa,
          };
        } else {
          pinVoltages[`${pumpComp.id}.VCC`] = 5.0;
          pinVoltages[`${pumpComp.id}.GND`] = 5.0; // Open drain pulled up
          componentStates[pumpComp.id] = {
            isRunning: false,
            rpm: 0,
            flowRateLph: 0,
            activeCurrentMa: 0,
          };
        }
      }
    }
  } else {
    // Generic circuit simulation fallback
    project.components.forEach((comp) => {
      if (comp.type === 'led') {
        const isPowered = project.wires.some(
          (w) =>
            (w.from.componentId === comp.id || w.to.componentId === comp.id) &&
            ((w.color || '').includes('red') || (w.color || '').includes('green') || (w.color || '').includes('yellow'))
        );
        componentStates[comp.id] = {
          state: isPowered ? 'on' : 'off',
          brightness: isPowered ? 1.0 : 0.0,
          currentMa: isPowered ? 15 : 0,
        };
        if (isPowered) totalCurrentMa += 15;
      }
    });
  }

  // 4. Design Rule Checks (DRC)
  // Check for floating power or ground pins
  project.components.forEach((comp) => {
    if (comp.type !== 'breadboard') {
      const connectedPinIds = new Set<string>();
      project.wires.forEach((w) => {
        if (w.from.componentId === comp.id) connectedPinIds.add(w.from.pinId);
        if (w.to.componentId === comp.id) connectedPinIds.add(w.to.pinId);
      });

      if (connectedPinIds.size === 0) {
        drcIssues.push({
          id: `drc_unconnected_${comp.id}`,
          severity: 'warning',
          title: `Unconnected Component: ${comp.label}`,
          description: `${comp.name} has no electrical connections. It will remain dormant in the circuit.`,
          componentId: comp.id,
          suggestedFix: 'Connect pins to your microcontroller or power rails.',
        });
      }
    }
  });

  // Calculate waveform channels for oscilloscope
  // CH1: primary signal (e.g. D12 or GPIO26)
  // CH2: reference signal (e.g. button or analog sensor)
  const ch1Voltage = Object.values(pinVoltages)[8] ?? (totalCurrentMa > 50 ? 3.3 : 0.0);
  const ch2Voltage = Object.values(pinVoltages)[12] ?? 0.0;

  return {
    measurement: {
      timeMs: elapsedMs,
      channel1Voltage: Number(ch1Voltage.toFixed(2)),
      channel2Voltage: Number(ch2Voltage.toFixed(2)),
      totalCurrentMa: Math.round(totalCurrentMa),
      pinVoltages,
      pinStates,
      componentStates,
    },
    drcIssues,
  };
}

export function runDrcChecks(components: any[], wires: any[]): DrcIssue[] {
  const dummyProject: any = {
    components,
    wires,
    firmware: { target: 'arduino_uno', code: '', isCompiled: true, compileLog: '', serialLogs: [] },
  };
  const { drcIssues } = runSimulationStep(dummyProject, 0, {
    buttonStates: {},
    soilMoistureOverrides: {},
    potentiometerPositions: {},
  });
  return drcIssues;
}

export function stepSimulation(
  components: any[],
  wires: any[],
  firmware: any
): { updatedComponents: any[]; measurements: SimulationMeasurement; newLog?: string } {
  const dummyProject: any = { components, wires, firmware };
  const { measurement } = runSimulationStep(dummyProject, Date.now() % 10000, {
    buttonStates: {},
    soilMoistureOverrides: {},
    potentiometerPositions: {},
  });

  // Update components with live state
  const updatedComponents = components.map((c) => {
    if (measurement.componentStates[c.id]) {
      return {
        ...c,
        properties: {
          ...c.properties,
          ...measurement.componentStates[c.id],
        },
      };
    }
    return c;
  });

  return { updatedComponents, measurements: measurement };
}
