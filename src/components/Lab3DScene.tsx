import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CircuitComponent, CircuitWire, SimulationMeasurement } from '../types';
import {
  Compass,
  RotateCcw,
  Eye,
  Maximize,
  Move,
  Layers,
} from 'lucide-react';

interface Lab3DSceneProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  simulation: SimulationMeasurement | null;
  isSimulating: boolean;
  onFallbackTo2D?: () => void;
}

// Helper to recursively dispose Three.js meshes, geometries, and materials
function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

export const Lab3DScene: React.FC<Lab3DSceneProps> = ({
  components,
  wires,
  selectedComponentId,
  onSelectComponent,
  simulation,
  isSimulating,
  onFallbackTo2D,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const componentMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const wireMeshesRef = useRef<THREE.Group | null>(null);
  const ledLightsRef = useRef<Map<string, THREE.PointLight>>(new Map());

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front'>('iso');

  // Set camera view angles
  const setPresetCamera = (view: 'iso' | 'top' | 'front') => {
    setCameraView(view);
    if (!cameraRef.current) return;
    if (view === 'iso') {
      cameraSphericalRef.current = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 };
    } else if (view === 'top') {
      cameraSphericalRef.current = { radius: 15, theta: 0.001, phi: 0.01 };
    } else if (view === 'front') {
      cameraSphericalRef.current = { radius: 14, theta: 0, phi: Math.PI / 2.1 };
    }
    updateCameraPosition();
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current;
    const target = cameraTargetRef.current;

    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + radius * Math.cos(phi);
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(target);
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability beforehand
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError('WebGL context is not supported or was blocked by the browser.');
        return;
      }
    } catch (err: any) {
      setWebglError(err?.message || 'WebGL check failed');
      return;
    }

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f14);
    sceneRef.current = scene;

    // Subtle fog for depth
    scene.fog = new THREE.FogExp2(0x0c0f14, 0.025);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer with safe creation and error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (err: any) {
      console.warn('Failed to create WebGLRenderer:', err);
      setWebglError(
        err?.message ||
          'Failed to create WebGL context. Web page caused context loss or hardware acceleration is unavailable.'
      );
      return;
    }

    // Context loss prevention & recovery
    let animationFrameId = 0;
    const domElement = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animationFrameId);
      setWebglError('WebGL context was lost or blocked by the browser.');
    };

    const handleContextRestored = () => {
      setWebglError(null);
      setRetryCount((c) => c + 1);
    };

    domElement.addEventListener('webglcontextlost', handleContextLost, false);
    domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xffffff, 1.8, 40, Math.PI / 4, 0.4, 1.0);
    mainSpot.position.set(8, 16, 10);
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    scene.add(mainSpot);

    const fillLight = new THREE.DirectionalLight(0x90a0d0, 0.6);
    fillLight.position.set(-10, 10, -8);
    scene.add(fillLight);

    // 5. Electronics Lab Mat & Ground Grid
    const matGeo = new THREE.PlaneGeometry(28, 20);
    const matMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.85,
      metalness: 0.15,
    });
    const labMat = new THREE.Mesh(matGeo, matMat);
    labMat.rotation.x = -Math.PI / 2;
    labMat.position.y = -0.05;
    labMat.receiveShadow = true;
    scene.add(labMat);

    const gridHelper = new THREE.GridHelper(26, 26, 0x3b82f6, 0x1f2738);
    gridHelper.position.y = -0.04;
    scene.add(gridHelper);

    // Group for jumper wires
    const wiresGroup = new THREE.Group();
    scene.add(wiresGroup);
    wireMeshesRef.current = wiresGroup;

    // 6. Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Mouse Interaction for Orbit / Pan
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
      } else if (e.button === 2) {
        isPanningRef.current = true;
      }
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

      if (isDraggingRef.current) {
        cameraSphericalRef.current.theta -= deltaX * 0.008;
        cameraSphericalRef.current.phi = Math.max(
          0.1,
          Math.min(Math.PI / 2.05, cameraSphericalRef.current.phi - deltaY * 0.008)
        );
        updateCameraPosition();
      } else if (isPanningRef.current) {
        const factor = 0.015;
        cameraTargetRef.current.x -= deltaX * factor;
        cameraTargetRef.current.z -= deltaY * factor;
        updateCameraPosition();
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.002;
      cameraSphericalRef.current.radius = Math.max(
        4,
        Math.min(28, cameraSphericalRef.current.radius + e.deltaY * zoomSpeed * 6)
      );
      updateCameraPosition();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // Raycast on click for component selection
    const onClick = (e: MouseEvent) => {
      if (!container || !camera || !scene) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const interactiveObjects: THREE.Object3D[] = [];
      componentMeshesRef.current.forEach((grp) => {
        grp.traverse((child) => {
          if (child instanceof THREE.Mesh) interactiveObjects.push(child);
        });
      });

      const intersects = raycaster.intersectObjects(interactiveObjects, true);
      if (intersects.length > 0) {
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && curr.parent && curr.parent !== scene) {
          if (curr.userData?.componentId) {
            onSelectComponent(curr.userData.componentId);
            return;
          }
          curr = curr.parent;
        }
      } else {
        onSelectComponent(null);
      }
    };

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('contextmenu', onContextMenu);
    domElement.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domElement.removeEventListener('webglcontextlost', handleContextLost);
      domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('contextmenu', onContextMenu);
      domElement.removeEventListener('click', onClick);

      if (sceneRef.current) {
        disposeHierarchy(sceneRef.current);
      }
      try {
        renderer.dispose();
        renderer.forceContextLoss();
      } catch {
        // Ignore dispose error
      }
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [retryCount]);

  // Update 3D Component Models
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old components and dispose GPU resources
    componentMeshesRef.current.forEach((grp) => {
      scene.remove(grp);
      disposeHierarchy(grp);
    });
    componentMeshesRef.current.clear();
    ledLightsRef.current.clear();

    // Render Full Prototyping Solderless Breadboard in the center
    const breadboard = create3DBreadboard();
    scene.add(breadboard);
    componentMeshesRef.current.set('breadboard_base', breadboard);

    // Build each component in 3D
    components.forEach((comp) => {
      const group = new THREE.Group();
      group.userData = { componentId: comp.id };
      group.position.set(...comp.position3d);
      group.rotation.set(...comp.rotation3d);

      switch (comp.type) {
        case 'arduino_uno':
          group.add(create3DArduinoUno());
          break;
        case 'esp32':
          group.add(create3DESP32());
          break;
        case 'led': {
          const { mesh, light } = create3DLED(comp.properties.color || 'green');
          group.add(mesh);
          ledLightsRef.current.set(comp.id, light);
          break;
        }
        case 'resistor':
          group.add(create3DResistor(comp.properties.resistance || 220));
          break;
        case 'pushbutton':
          group.add(create3DPushbutton(comp.properties.isPressed));
          break;
        case 'soil_sensor':
          group.add(create3DSoilSensor());
          break;
        case 'water_pump':
          group.add(create3DWaterPump());
          break;
        case 'mosfet':
          group.add(create3DMOSFET());
          break;
        case 'battery':
          group.add(create3DBattery());
          break;
        case 'and_gate':
        case 'or_gate':
        case 'not_gate':
        case 'nand_gate':
        case 'nor_gate':
        case 'xor_gate':
        case 'xnor_gate':
          group.add(create3DLogicGateIC(comp.type, comp.label || comp.name));
          break;
        case 'logic_switch':
          group.add(create3DLogicSwitch(comp.properties.state === 1));
          break;
        case 'logic_probe':
          group.add(create3DLogicProbe(comp.properties.value === 1));
          break;
        default:
          group.add(createGeneric3DComponent(comp.name));
          break;
      }

      // Add selection ring if selected
      if (comp.id === selectedComponentId) {
        const ringGeo = new THREE.RingGeometry(0.8, 0.95, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x8b5cf6,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);
      }

      scene.add(group);
      componentMeshesRef.current.set(comp.id, group);
    });
  }, [components, selectedComponentId]);

  // Update LED Glow & Simulation Visuals
  useEffect(() => {
    if (!simulation) return;

    components.forEach((comp) => {
      if (comp.type === 'led') {
        const state = simulation.componentStates[comp.id];
        const light = ledLightsRef.current.get(comp.id);
        const group = componentMeshesRef.current.get(comp.id);

        const isOn = state?.state === 'on';
        if (light) {
          light.intensity = isOn ? 2.5 : 0.0;
        }

        if (group) {
          const domeMesh = group.getObjectByName('led_dome') as THREE.Mesh;
          if (domeMesh && domeMesh.material instanceof THREE.MeshStandardMaterial) {
            domeMesh.material.emissiveIntensity = isOn ? 2.0 : 0.1;
          }
        }
      } else if (['and_gate', 'or_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xor_gate', 'xnor_gate'].includes(comp.type)) {
        const state = simulation.componentStates[comp.id];
        const group = componentMeshesRef.current.get(comp.id);
        if (group) {
          const indicator = group.getObjectByName('gate_indicator') as THREE.Mesh;
          if (indicator && indicator.material instanceof THREE.MeshStandardMaterial) {
            const isHigh = state?.logicState === 1;
            indicator.material.emissive.setHex(isHigh ? 0x10b981 : 0x1e293b);
            indicator.material.emissiveIntensity = isHigh ? 2.5 : 0.2;
          }
        }
      } else if (comp.type === 'logic_probe') {
        const state = simulation.componentStates[comp.id];
        const group = componentMeshesRef.current.get(comp.id);
        if (group) {
          const probeLight = group.getObjectByName('probe_led') as THREE.Mesh;
          if (probeLight && probeLight.material instanceof THREE.MeshStandardMaterial) {
            const isHigh = state?.value === 1;
            probeLight.material.emissive.setHex(isHigh ? 0x22c55e : 0x3b82f6);
            probeLight.material.emissiveIntensity = 2.0;
          }
        }
      }
    });
  }, [simulation]);

  // Update 3D Wires (Jumper Wires with Realistic Droop Bezier Curves)
  useEffect(() => {
    const wiresGroup = wireMeshesRef.current;
    if (!wiresGroup) return;

    // Clear old wire meshes and dispose GPU memory
    while (wiresGroup.children.length > 0) {
      const child = wiresGroup.children[0];
      wiresGroup.remove(child);
      disposeHierarchy(child);
    }

    // Generate physical 3D jumper wires
    wires.forEach((wire) => {
      const fromComp = components.find((c) => c.id === wire.from.componentId);
      const toComp = components.find((c) => c.id === wire.to.componentId);
      if (!fromComp || !toComp) return;

      const fromPin = fromComp.pins.find((p) => p.id === wire.from.pinId);
      const toPin = toComp.pins.find((p) => p.id === wire.to.pinId);

      const start = new THREE.Vector3(
        fromComp.position3d[0] + (fromPin?.x3d || 0),
        fromComp.position3d[1] + (fromPin?.y3d || 0.3),
        fromComp.position3d[2] + (fromPin?.z3d || 0)
      );

      const end = new THREE.Vector3(
        toComp.position3d[0] + (toPin?.x3d || 0),
        toComp.position3d[1] + (toPin?.y3d || 0.3),
        toComp.position3d[2] + (toPin?.z3d || 0)
      );

      // Arc apex for natural jumper wire droop/bend
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      mid.y += Math.max(0.6, distance * 0.35);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.045, 8, false);

      const wireColor = new THREE.Color(wire.color);
      const wireMat = new THREE.MeshStandardMaterial({
        color: wireColor,
        roughness: 0.4,
        metalness: 0.1,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, wireMat);
      tubeMesh.castShadow = true;
      wiresGroup.add(tubeMesh);

      // Connector pin ends (black header pins)
      const pinEndGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8);
      const pinMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
      const pin1 = new THREE.Mesh(pinEndGeo, pinMat);
      pin1.position.copy(start);
      const pin2 = new THREE.Mesh(pinEndGeo, pinMat);
      pin2.position.copy(end);
      wiresGroup.add(pin1);
      wiresGroup.add(pin2);
    });
  }, [wires, components]);

  if (webglError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-[#0c0f16] text-slate-200 select-none font-sans">
        <div className="max-w-md w-full bg-[#121722] border border-violet-500/30 rounded-xl p-6 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mx-auto text-violet-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-100 font-mono">
              3D Lab Graphics Fallback
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              WebGL context could not be acquired in this browser session. All schematic editing, circuit simulation, multimeter telemetry, and KITT AI co-pilot tools are fully active in the 2D EDA Schematic.
            </p>
          </div>

          <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#202738] flex items-center justify-around text-xs font-mono text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">PARTS</span>
              <span className="font-bold text-violet-400">{components.length} Items</span>
            </div>
            <div className="h-6 w-px bg-[#202738]" />
            <div>
              <span className="text-slate-500 block text-[10px]">WIRES</span>
              <span className="font-bold text-cyan-400">{wires.length} Nets</span>
            </div>
            <div className="h-6 w-px bg-[#202738]" />
            <div>
              <span className="text-slate-500 block text-[10px]">KERNEL</span>
              <span className={`font-bold ${isSimulating ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isSimulating ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() => onFallbackTo2D?.()}
              className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/40 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Switch to 2D EDA Schematic</span>
            </button>
            <button
              onClick={() => {
                setWebglError(null);
                setRetryCount((c) => c + 1);
              }}
              className="py-2.5 px-3 bg-[#19202c] hover:bg-[#222b3b] text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#2b364d] cursor-pointer"
              title="Attempt to reinitialize WebGL context"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry 3D</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D Viewport Controls Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[#161b24]/90 backdrop-blur p-1 rounded-lg border border-[#262f40] shadow-xl">
        <button
          onClick={() => setPresetCamera('iso')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
            cameraView === 'iso' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#202736]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Isometric</span>
        </button>
        <button
          onClick={() => setPresetCamera('top')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
            cameraView === 'top' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#202736]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Top Down</span>
        </button>
        <button
          onClick={() => setPresetCamera('front')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
            cameraView === 'front' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#202736]'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          <span>Front</span>
        </button>
        <div className="h-4 w-px bg-[#262f40] mx-1" />
        <button
          onClick={() => {
            cameraTargetRef.current.set(0, 0, 0);
            setPresetCamera('iso');
          }}
          title="Reset Camera Target"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#202736] rounded"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation Help overlay */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 bg-[#111622]/80 backdrop-blur rounded-md border border-[#232c3d] text-[11px] font-mono text-slate-400 pointer-events-none flex items-center gap-3">
        <span>🖱 Left-drag: Orbit</span>
        <span>🖱 Right-drag: Pan</span>
        <span>🖱 Scroll: Zoom</span>
        <span>👆 Click: Select Part</span>
      </div>

      {/* Clean 3D Breadboard Workspace Indicator */}
      {components.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-6 select-none z-10">
          <div className="max-w-md p-6 rounded-2xl bg-[#0e121a]/85 border border-[#232c3d]/70 backdrop-blur-sm shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider mb-1.5">
              Clean 3D Breadboard Lab
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Workbench is clean and ready. Add components from the <strong className="text-violet-300">Parts</strong> library or ask <strong className="text-violet-300">KITT AI</strong> on the left.
            </p>
          </div>
        </div>
      )}

      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};

// ==========================================
// PROCEDURAL 3D ELECTRONIC COMPONENT MODELS
// ==========================================

function create3DBreadboard(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0.6, 0.15, 0);

  // White Plastic Body
  const bodyGeo = new THREE.BoxGeometry(6.8, 0.3, 3.2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Red and Blue Power Lines on rails
  const lineGeo = new THREE.BoxGeometry(6.4, 0.02, 0.05);
  const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

  const redTop = new THREE.Mesh(lineGeo, redMat);
  redTop.position.set(0, 0.16, -1.4);
  const blueTop = new THREE.Mesh(lineGeo, blueMat);
  blueTop.position.set(0, 0.16, -1.25);

  const redBottom = new THREE.Mesh(lineGeo, redMat);
  redBottom.position.set(0, 0.16, 1.25);
  const blueBottom = new THREE.Mesh(lineGeo, blueMat);
  blueBottom.position.set(0, 0.16, 1.4);

  group.add(redTop, blueTop, redBottom, blueBottom);

  // Center Divider Trench
  const trenchGeo = new THREE.BoxGeometry(6.6, 0.05, 0.2);
  const trenchMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const trench = new THREE.Mesh(trenchGeo, trenchMat);
  trench.position.set(0, 0.14, 0);
  group.add(trench);

  return group;
}

function create3DArduinoUno(): THREE.Group {
  const group = new THREE.Group();

  // Cyan PCB Board
  const pcbGeo = new THREE.BoxGeometry(2.6, 0.15, 3.8);
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x00878f,
    roughness: 0.3,
    metalness: 0.2,
  });
  const pcb = new THREE.Mesh(pcbGeo, pcbMat);
  pcb.castShadow = true;
  group.add(pcb);

  // ATmega328P Microcontroller Chip
  const chipGeo = new THREE.BoxGeometry(0.7, 0.18, 2.0);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
  const chip = new THREE.Mesh(chipGeo, chipMat);
  chip.position.set(0, 0.12, 0.3);
  group.add(chip);

  // Silver USB Type-B Socket
  const usbGeo = new THREE.BoxGeometry(0.6, 0.5, 0.7);
  const usbMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
  const usb = new THREE.Mesh(usbGeo, usbMat);
  usb.position.set(-0.9, 0.28, -1.7);
  group.add(usb);

  // Black Power Barrel Jack
  const jackGeo = new THREE.BoxGeometry(0.6, 0.45, 0.8);
  const jackMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const jack = new THREE.Mesh(jackGeo, jackMat);
  jack.position.set(0.9, 0.25, -1.7);
  group.add(jack);

  // Female Pin Headers (Dual In-Line Rows)
  const headerGeo = new THREE.BoxGeometry(0.25, 0.4, 2.4);
  const headerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  const headerLeft = new THREE.Mesh(headerGeo, headerMat);
  headerLeft.position.set(-1.15, 0.22, 0.4);
  const headerRight = new THREE.Mesh(headerGeo, headerMat);
  headerRight.position.set(1.15, 0.22, 0.4);
  group.add(headerLeft, headerRight);

  return group;
}

function create3DESP32(): THREE.Group {
  const group = new THREE.Group();

  // Dark PCB
  const pcbGeo = new THREE.BoxGeometry(1.9, 0.12, 3.2);
  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  const pcb = new THREE.Mesh(pcbGeo, pcbMat);
  pcb.castShadow = true;
  group.add(pcb);

  // Metal RF Shielding Can
  const rfGeo = new THREE.BoxGeometry(1.2, 0.18, 1.4);
  const rfMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
  const rfShield = new THREE.Mesh(rfGeo, rfMat);
  rfShield.position.set(0, 0.12, 0.4);
  group.add(rfShield);

  // Micro USB Port
  const usbGeo = new THREE.BoxGeometry(0.4, 0.16, 0.35);
  const usbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const usb = new THREE.Mesh(usbGeo, usbMat);
  usb.position.set(0, 0.1, -1.5);
  group.add(usb);

  // Dual Row Pin Headers
  const pinGeo = new THREE.BoxGeometry(0.2, 0.35, 2.6);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const leftPins = new THREE.Mesh(pinGeo, pinMat);
  leftPins.position.set(-0.85, 0.2, 0);
  const rightPins = new THREE.Mesh(pinGeo, pinMat);
  rightPins.position.set(0.85, 0.2, 0);
  group.add(leftPins, rightPins);

  return group;
}

function create3DLED(colorName: string): { mesh: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();

  let hex = 0x22c55e;
  if (colorName === 'red') hex = 0xef4444;
  else if (colorName === 'yellow') hex = 0xeab308;
  else if (colorName === 'blue') hex = 0x3b82f6;

  // Translucent Epoxy Bulb Dome
  const domeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 16);
  const topGeo = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);

  const domeMat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 0.1,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  const cylinder = new THREE.Mesh(domeGeo, domeMat);
  cylinder.name = 'led_dome';
  cylinder.position.y = 0.45;
  const top = new THREE.Mesh(topGeo, domeMat);
  top.position.y = 0.67;
  group.add(cylinder, top);

  // Wire Legs (Anode and Cathode)
  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
  const legAnode = new THREE.Mesh(legGeo, legMat);
  legAnode.position.set(-0.08, 0.15, 0);
  const legCathode = new THREE.Mesh(legGeo, legMat);
  legCathode.position.set(0.08, 0.12, 0);
  group.add(legAnode, legCathode);

  // Real Dynamic Light Source
  const light = new THREE.PointLight(hex, 0, 4);
  light.position.set(0, 0.7, 0);
  group.add(light);

  return { mesh: group, light };
}

function create3DResistor(resistance: number): THREE.Group {
  const group = new THREE.Group();

  // Ceramic Resistor Body (Beige/Cyan)
  const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.65, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4b996, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.2;
  group.add(body);

  // Color bands (e.g. 220R -> Red, Red, Brown, Gold)
  const bandGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.06, 12);
  const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const brownMat = new THREE.MeshBasicMaterial({ color: 0x78350f });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 });

  const b1 = new THREE.Mesh(bandGeo, redMat);
  b1.rotation.z = Math.PI / 2;
  b1.position.set(-0.2, 0.2, 0);

  const b2 = new THREE.Mesh(bandGeo, redMat);
  b2.rotation.z = Math.PI / 2;
  b2.position.set(-0.08, 0.2, 0);

  const b3 = new THREE.Mesh(bandGeo, brownMat);
  b3.rotation.z = Math.PI / 2;
  b3.position.set(0.06, 0.2, 0);

  const b4 = new THREE.Mesh(bandGeo, goldMat);
  b4.rotation.z = Math.PI / 2;
  b4.position.set(0.22, 0.2, 0);

  group.add(b1, b2, b3, b4);

  // Bent Wire Leads
  const leadGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 });
  const l1 = new THREE.Mesh(leadGeo, leadMat);
  l1.position.set(-0.45, 0.1, 0);
  const l2 = new THREE.Mesh(leadGeo, leadMat);
  l2.position.set(0.45, 0.1, 0);
  group.add(l1, l2);

  return group;
}

function create3DPushbutton(isPressed: boolean = false): THREE.Group {
  const group = new THREE.Group();

  // Black Square Base
  const baseGeo = new THREE.BoxGeometry(0.7, 0.25, 0.7);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  group.add(base);

  // Round Tactile Plunger
  const plungerGeo = new THREE.CylinderGeometry(0.18, 0.18, isPressed ? 0.08 : 0.18, 16);
  const plungerMat = new THREE.MeshStandardMaterial({
    color: isPressed ? 0xef4444 : 0x475569,
    roughness: 0.4,
  });
  const plunger = new THREE.Mesh(plungerGeo, plungerMat);
  plunger.position.y = isPressed ? 0.3 : 0.35;
  group.add(plunger);

  return group;
}

function create3DSoilSensor(): THREE.Group {
  const group = new THREE.Group();

  // Green PCB Probe Blade
  const bladeGeo = new THREE.BoxGeometry(0.7, 0.08, 1.8);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.4 });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 0.1;
  group.add(blade);

  // Gold Sensing Traces
  const traceGeo = new THREE.BoxGeometry(0.15, 0.09, 1.2);
  const traceMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 });
  const t1 = new THREE.Mesh(traceGeo, traceMat);
  t1.position.set(-0.2, 0.1, 0.2);
  const t2 = new THREE.Mesh(traceGeo, traceMat);
  t2.position.set(0.2, 0.1, 0.2);
  group.add(t1, t2);

  return group;
}

function create3DWaterPump(): THREE.Group {
  const group = new THREE.Group();

  // Blue Cylindrical Motor Body
  const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  group.add(body);

  // Water Nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 12);
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(0.65, 0.7, 0);
  group.add(nozzle);

  return group;
}

function create3DMOSFET(): THREE.Group {
  const group = new THREE.Group();

  // Black TO-220 Epoxy Casing
  const bodyGeo = new THREE.BoxGeometry(0.65, 0.65, 0.25);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);

  // Silver Metal Tab with mounting hole
  const tabGeo = new THREE.BoxGeometry(0.65, 0.35, 0.05);
  const tabMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
  const tab = new THREE.Mesh(tabGeo, tabMat);
  tab.position.set(0, 0.8, -0.1);
  group.add(tab);

  return group;
}

function create3DBattery(): THREE.Group {
  const group = new THREE.Group();

  // 4xAA Battery Holder Pack
  const packGeo = new THREE.BoxGeometry(1.8, 0.6, 1.4);
  const packMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 });
  const pack = new THREE.Mesh(packGeo, packMat);
  pack.position.y = 0.3;
  group.add(pack);

  return group;
}

function createGeneric3DComponent(name: string): THREE.Group {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.y = 0.2;
  group.add(box);
  return group;
}

function create3DLogicGateIC(type: string, label: string): THREE.Group {
  const group = new THREE.Group();

  // Standard DIP-14 IC Body (Dual In-Line Package)
  const icBodyGeo = new THREE.BoxGeometry(1.8, 0.35, 0.85);
  const icBodyMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
    metalness: 0.15,
  });
  const icBody = new THREE.Mesh(icBodyGeo, icBodyMat);
  icBody.position.y = 0.28;
  group.add(icBody);

  // Pin 1 Index Notch
  const notchGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.36, 16, 1, false, 0, Math.PI);
  const notchMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const notch = new THREE.Mesh(notchGeo, notchMat);
  notch.position.set(-0.9, 0.28, 0);
  notch.rotation.y = -Math.PI / 2;
  group.add(notch);

  // Laser marking badge on IC top surface
  const labelGeo = new THREE.PlaneGeometry(1.2, 0.45);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 96;
  const ctx = labelCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icCode =
      type === 'and_gate'
        ? 'SN74LS08N'
        : type === 'or_gate'
        ? 'SN74LS32N'
        : type === 'not_gate'
        ? 'SN74LS04N'
        : type === 'nand_gate'
        ? 'SN74LS00N'
        : type === 'nor_gate'
        ? 'SN74LS02N'
        : type === 'xor_gate'
        ? 'SN74LS86N'
        : 'SN74LS266';
    ctx.fillText(icCode, 128, 38);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label.split(' ')[0] || 'LOGIC', 128, 68);
  }
  const texture = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshBasicMaterial({ map: texture });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.rotation.x = -Math.PI / 2;
  labelMesh.position.set(0, 0.46, 0);
  group.add(labelMesh);

  // Logic Output Real-time Mini LED Indicator on top
  const ledGeo = new THREE.SphereGeometry(0.08, 12, 12);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x064e3b,
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });
  const indicator = new THREE.Mesh(ledGeo, ledMat);
  indicator.name = 'gate_indicator';
  indicator.position.set(0.65, 0.46, 0);
  group.add(indicator);

  // 14 Metallic Gull-wing Pins (7 on front side, 7 on back side)
  const pinGeo = new THREE.BoxGeometry(0.06, 0.3, 0.08);
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.95,
    roughness: 0.2,
  });

  for (let i = 0; i < 7; i++) {
    const xPos = -0.6 + i * 0.2;
    // Front side pins
    const pFront = new THREE.Mesh(pinGeo, pinMat);
    pFront.position.set(xPos, 0.15, 0.45);
    // Back side pins
    const pBack = new THREE.Mesh(pinGeo, pinMat);
    pBack.position.set(xPos, 0.15, -0.45);
    group.add(pFront, pBack);
  }

  return group;
}

function create3DLogicSwitch(state: boolean): THREE.Group {
  const group = new THREE.Group();

  // Miniature SPDT Rocker Housing
  const bodyGeo = new THREE.BoxGeometry(0.9, 0.4, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.2;
  group.add(body);

  // Toggle Lever
  const leverGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.35, 12);
  const leverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
  const lever = new THREE.Mesh(leverGeo, leverMat);
  lever.position.set(state ? 0.15 : -0.15, 0.42, 0);
  lever.rotation.z = state ? -0.35 : 0.35;
  group.add(lever);

  // Status LED Dot
  const ledGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const ledMat = new THREE.MeshStandardMaterial({
    color: state ? 0x22c55e : 0x64748b,
    emissive: state ? 0x22c55e : 0x1e293b,
    emissiveIntensity: state ? 1.5 : 0.1,
  });
  const dot = new THREE.Mesh(ledGeo, ledMat);
  dot.position.set(0, 0.41, 0.18);
  group.add(dot);

  return group;
}

function create3DLogicProbe(value: boolean): THREE.Group {
  const group = new THREE.Group();

  // Probe Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.35, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.2;
  group.add(body);

  // Digital LED Display Lens
  const lensGeo = new THREE.BoxGeometry(0.5, 0.05, 0.35);
  const lensMat = new THREE.MeshStandardMaterial({
    color: value ? 0x22c55e : 0x3b82f6,
    emissive: value ? 0x22c55e : 0x3b82f6,
    emissiveIntensity: 1.8,
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.name = 'probe_led';
  lens.position.set(0, 0.38, 0);
  group.add(lens);

  return group;
}
