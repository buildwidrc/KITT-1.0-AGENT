import React from 'react';
import { CircuitComponent } from '../types';
import { Download, FileSpreadsheet, Layers, ShoppingBag } from 'lucide-react';

interface BomViewProps {
  components: CircuitComponent[];
}

export const BomView: React.FC<BomViewProps> = ({ components }) => {
  // Aggregate components by type and label
  const bomRows = components.reduce((acc, comp) => {
    const key = `${comp.type}-${comp.label}`;
    if (!acc[key]) {
      acc[key] = {
        name: comp.label,
        type: comp.type,
        designators: [comp.name],
        quantity: 1,
        footprint:
          comp.type === 'arduino_uno'
            ? 'DEV-BOARD-UNO-R3'
            : comp.type === 'esp32'
            ? 'MODULE-ESP32-DEVKIT'
            : comp.type === 'resistor'
            ? 'RES-THRUHOLE-AXIAL-0.25W'
            : comp.type === 'led'
            ? 'LED-THRUHOLE-5MM'
            : 'THRUHOLE-STANDARD',
        unitCostEst:
          comp.type === 'arduino_uno'
            ? 18.5
            : comp.type === 'esp32'
            ? 5.8
            : comp.type === 'resistor'
            ? 0.05
            : comp.type === 'led'
            ? 0.12
            : comp.type === 'soil_sensor'
            ? 2.4
            : comp.type === 'water_pump'
            ? 4.5
            : 0.5,
      };
    } else {
      acc[key].quantity += 1;
      acc[key].designators.push(comp.name);
    }
    return acc;
  }, {} as Record<string, { name: string; type: string; designators: string[]; quantity: number; footprint: string; unitCostEst: number }>);

  const rows = Object.values(bomRows);
  const totalCost = rows.reduce((sum, r) => sum + r.quantity * r.unitCostEst, 0);

  const exportCsv = () => {
    let csv = 'Item,Component,Designators,Quantity,Footprint,Unit Cost (USD),Ext Cost (USD)\n';
    rows.forEach((r, idx) => {
      csv += `${idx + 1},"${r.name}","${r.designators.join(', ')}",${r.quantity},"${r.footprint}",$${r.unitCostEst.toFixed(
        2
      )},$${(r.quantity * r.unitCostEst).toFixed(2)}\n`;
    });
    csv += `\nTotal Estimated Project Hardware Cost,,,,,,$${totalCost.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom_project_inventory.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-[#0d1017] p-8 overflow-y-auto select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-slate-100 font-mono tracking-wide">
                BILL OF MATERIALS & PROCUREMENT (BOM)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Live synchronized procurement manifest derived from canonical project netlist.
            </p>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-blue-300 rounded-lg text-xs font-mono font-semibold border border-blue-500/30 transition-colors shadow"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#141824] rounded-xl border border-[#232c3d] overflow-hidden shadow-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0f121a] border-b border-[#232c3d] text-slate-400 font-bold text-[10px] tracking-wider uppercase">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Component Description</th>
                <th className="p-3.5">Designators</th>
                <th className="p-3.5">Qty</th>
                <th className="p-3.5">Footprint</th>
                <th className="p-3.5">Est. Unit</th>
                <th className="p-3.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2738] text-slate-300">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-[#1a202e] transition-colors">
                  <td className="p-3.5 text-slate-500">{index + 1}</td>
                  <td className="p-3.5 font-semibold text-slate-100">{row.name}</td>
                  <td className="p-3.5 text-violet-300">{row.designators.join(', ')}</td>
                  <td className="p-3.5 font-bold text-slate-200">{row.quantity}</td>
                  <td className="p-3.5 text-slate-400">{row.footprint}</td>
                  <td className="p-3.5 text-slate-300">${row.unitCostEst.toFixed(2)}</td>
                  <td className="p-3.5 font-bold text-emerald-400">
                    ${(row.quantity * row.unitCostEst).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Total */}
          <div className="p-4 bg-[#0f121a] border-t border-[#232c3d] flex justify-between items-center text-xs font-mono">
            <div className="text-slate-400">
              Unique Part Types: <span className="text-slate-200 font-bold">{rows.length}</span> | Total Components:{' '}
              <span className="text-slate-200 font-bold">{components.length}</span>
            </div>
            <div className="text-slate-300">
              Total Hardware Estimate:{' '}
              <span className="text-emerald-400 font-extrabold text-sm ml-1">${totalCost.toFixed(2)} USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
