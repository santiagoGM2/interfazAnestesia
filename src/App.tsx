import React from 'react'
import { AnesthesiaDiagram } from './components/diagram/AnesthesiaDiagram'
import { GasControlPanel } from './components/controls/ControlPanel'
import { VentilatorPanel } from './components/controls/VentilatorPanel'
import { AlertPanel } from './components/displays/AlertPanel'
import { ModeSelector } from './components/displays/ModeSelector'
import { useVentilatorCycle } from './hooks/useVentilatorCycle'
import { useAnesthesiaStore } from './store/useAnesthesiaStore'

function GasMixBar() {
  const { fio2, fn2o, agentFraction, totalFGF, o2FlushActive, failSafeActive } = useAnesthesiaStore()
  const hypoxic = fio2 > 0 && fio2 < 0.21

  return (
    <div className="flex items-center gap-3">
      {o2FlushActive && (
        <div className="px-2.5 py-1 rounded bg-green-800 border border-green-600 text-green-200 text-xs font-bold font-mono tracking-wide">
          FLUSH O₂ ACTIVO
        </div>
      )}
      {failSafeActive && (
        <div className="px-2.5 py-1 rounded bg-red-800 border border-red-600 text-red-200 text-xs font-bold font-mono tracking-wide">
          FAIL-SAFE ACTIVADO
        </div>
      )}
      <div className="hidden lg:flex items-center gap-0 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {[
          { label: 'FiO₂',  val: `${(fio2 * 100).toFixed(0)}%`,          col: hypoxic ? '#ef4444' : '#22c55e' },
          { label: 'FiN₂O', val: `${(fn2o * 100).toFixed(0)}%`,           col: '#3b82f6' },
          { label: 'Agente', val: `${(agentFraction * 100).toFixed(1)}%`,  col: '#a855f7' },
          { label: 'FGF',    val: `${totalFGF.toFixed(1)} L/min`,          col: '#06b6d4' },
        ].map(({ label, val, col }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-9 bg-slate-800" />}
            <div className="px-3 py-1 text-center">
              <div className="text-xs font-mono text-slate-500 leading-none mb-0.5">{label}</div>
              <div className="text-sm font-bold font-mono tabular-nums leading-none"
                style={{ color: col }}>{val}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  useVentilatorCycle()

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-slate-950 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-xs font-mono">
            Rx
          </div>
          <div>
            <div className="text-sm font-bold text-white font-mono tracking-wide leading-tight">
              Simulador de Maquina de Anestesia
            </div>
            <div className="text-xs text-slate-500 font-mono leading-tight">
              Flujo de Gases — Sistema Circular — Uso Academico
            </div>
          </div>
        </div>

        <GasMixBar />
        <ModeSelector />
      </header>

      {/* Main content: 3 columns */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <aside className="w-64 shrink-0 overflow-y-auto p-3 border-r border-slate-800 bg-slate-950">
          <GasControlPanel />
        </aside>

        {/* Center: Diagram */}
        <div className="flex-1 overflow-hidden relative">
          <AnesthesiaDiagram />
        </div>

        {/* Right panel */}
        <aside className="w-64 shrink-0 overflow-y-auto p-3 border-l border-slate-800 bg-slate-950">
          <VentilatorPanel />
        </aside>
      </main>

      {/* Alert bar */}
      <AlertPanel />
    </div>
  )
}
