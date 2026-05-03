import React from 'react'
import { useAnesthesiaStore } from '../../store/useAnesthesiaStore'
import type { OperatingMode } from '../../store/useAnesthesiaStore'

const MODES: { id: OperatingMode; label: string; color: string }[] = [
  { id: 'normal',         label: 'Normal',         color: '#22c55e' },
  { id: 'o2_failure',     label: 'Falla O₂',       color: '#ef4444' },
  { id: 'circuit_leak',   label: 'Fuga Circuito',  color: '#f97316' },
  { id: 'vaporizer_leak', label: 'Fuga Vaporizador', color: '#f59e0b' },
]

export function ModeSelector() {
  const { mode, setMode } = useAnesthesiaStore()
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-500 uppercase tracking-wider shrink-0">
        Escenario:
      </span>
      <div className="flex gap-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-all border ${
              mode === m.id
                ? 'text-black border-transparent'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
            style={mode === m.id ? { background: m.color, borderColor: m.color } : {}}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
