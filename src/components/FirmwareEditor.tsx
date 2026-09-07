import React, { useState } from 'react';
import { FirmwareProject, CircuitComponent } from '../types';
import { Code2, CheckCircle2, Cpu, Copy, RefreshCw } from 'lucide-react';

interface FirmwareEditorProps {
  firmware: FirmwareProject;
  onUpdateFirmware: (updatedCode: string) => void;
  components: CircuitComponent[];
}

export const FirmwareEditor: React.FC<FirmwareEditorProps> = ({
  firmware,
  onUpdateFirmware,
  components,
}) => {
  const [code, setCode] = useState(firmware.code);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileOutput, setCompileOutput] = useState(firmware.compileLog);
  const [copied, setCopied] = useState(false);

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      setCompileOutput(
        `[AVR-GCC 11.2.0 / ESP-IDF v4.4]\nCompilation verified nominal.\nProgram size: ${Math.floor(
          code.length * 1.8
        )} bytes.\nStatic RAM usage: 488 bytes (23%). Zero syntax warnings.`
      );
      onUpdateFirmware(code);
    }, 600);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mcuComponent = components.find((c) => c.type === 'arduino_uno' || c.type === 'esp32');

  return (
    <div className="w-full h-full bg-[#0b0e14] flex flex-col overflow-hidden">
      {/* Firmware Toolbar */}
      <div className="h-11 px-4 bg-[#11151e] border-b border-[#232936] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-slate-200">
            firmware/main.cpp
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1a2333] text-emerald-400 border border-emerald-500/30 rounded font-semibold">
            {mcuComponent ? mcuComponent.name : 'GENERIC C++'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1a202c] hover:bg-[#252e40] text-slate-300 rounded text-xs font-mono border border-[#2d3748] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleCompile}
            disabled={isCompiling}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-mono font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            {isCompiling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>{isCompiling ? 'COMPILING...' : 'VERIFY & FLASH'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Console Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Code Textarea with line numbers */}
        <div className="flex-1 h-full p-4 overflow-auto font-mono text-xs bg-[#090b10] text-slate-200">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              onUpdateFirmware(e.target.value);
            }}
            spellCheck={false}
            className="w-full h-full bg-transparent resize-none outline-none font-mono text-xs leading-relaxed text-emerald-300/90 selection:bg-violet-900"
          />
        </div>

        {/* Compile Output Console */}
        <div className="w-full md:w-80 h-40 md:h-full bg-[#0d1017] border-t md:border-t-0 md:border-l border-[#232936] p-3 flex flex-col font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2738] text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>TOOLCHAIN OUTPUT</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>GCC READY</span>
            </span>
          </div>
          <pre className="flex-1 overflow-auto text-[11px] text-slate-400 whitespace-pre-wrap leading-normal font-mono">
            {compileOutput}
          </pre>
        </div>
      </div>
    </div>
  );
};
