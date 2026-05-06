import React from 'react'
import { useAnesthesiaStore } from '../../store/useAnesthesiaStore'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  color: string
  onChange: (v: number) => void
  disabled?: boolean
}

function SliderRow({ label, value, min, max, step, unit, color, onChange, disabled }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={`mb-4 ${disabled ? 'opacity-35 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-mono tracking-wide" style={{ color }}>{label}</span>
        <span className="text-sm font-bold font-mono tabular-nums" style={{ color }}>
          {value.toFixed(step < 1 ? 1 : 0)}&nbsp;<span className="text-xs font-normal opacity-70">{unit}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-800">
        <div className="absolute h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
        <input type="range" min={min} max={max} step={step} value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5" />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-slate-700 font-mono">{min}</span>
        <span className="text-xs text-slate-700 font-mono">{max}</span>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">
      {children}
    </h3>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-3">
      {children}
    </div>
  )
}

export function GasControlPanel() {
  const {
    o2Flow, n2oFlow, setO2Flow, setN2oFlow,
    vaporizerOn, agentConcentration, setVaporizerOn, setAgentConcentration,
    o2FlushActive, setO2FlushActive,
    failSafeActive, fio2, fn2o, agentFraction, totalFGF,
    mode,
  } = useAnesthesiaStore()

  const hypoxic = fio2 > 0 && fio2 < 0.21

  return (
    <div className="flex flex-col gap-0">
      <Card>
        <SectionTitle>Control de Flujos</SectionTitle>
        <SliderRow label="O₂" value={o2Flow} min={0} max={12} step={0.1}
          unit="L/min" color="#22c55e" onChange={setO2Flow} />
        <SliderRow label="N₂O" value={n2oFlow} min={0} max={12} step={0.1}
          unit="L/min" color="#3b82f6" onChange={setN2oFlow}
          disabled={failSafeActive || o2Flow === 0} />

        {failSafeActive && (
          <div className="text-xs font-mono text-red-400 bg-red-950 border border-red-900 rounded px-2 py-1.5 mb-3 leading-snug">
            FAIL-SAFE ACTIVO — N₂O bloqueado por presion O₂ insuficiente (&lt;26 PSI)
          </div>
        )}
        {o2Flow === 0 && !failSafeActive && (
          <div className="text-xs font-mono text-amber-400 bg-amber-950 border border-amber-900 rounded px-2 py-1.5 mb-3 leading-snug">
            N₂O BLOQUEADO — Sin flujo de O₂ no se puede administrar N₂O (riesgo hipóxico)
          </div>
        )}

        {/* Mezcla resultante */}
        <div className="bg-slate-950 rounded px-3 py-2 space-y-1.5">
          <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-2">
            Mezcla resultante
          </div>
          {[
            { label: 'FiO₂', val: (fio2 * 100).toFixed(0) + '%', col: hypoxic ? '#ef4444' : '#22c55e' },
            { label: 'FiN₂O', val: (fn2o * 100).toFixed(0) + '%', col: '#3b82f6' },
            { label: 'Agente', val: (agentFraction * 100).toFixed(1) + '%', col: '#a855f7' },
            { label: 'FGF Total', val: totalFGF.toFixed(1) + ' L/min', col: '#06b6d4' },
          ].map(({ label, val, col }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs font-mono text-slate-500">{label}</span>
              <span className="text-sm font-bold font-mono tabular-nums" style={{ color: col }}>{val}</span>
            </div>
          ))}
          {hypoxic && (
            <div className="text-xs font-mono font-bold text-red-400 border border-red-900 bg-red-950 rounded px-2 py-1 mt-1 text-center tracking-wide">
              MEZCLA HIPOXICA — FiO₂ &lt; 21%
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Vaporizador</SectionTitle>
          <button
            onClick={() => setVaporizerOn(!vaporizerOn)}
            className={`px-3 py-1 rounded text-xs font-bold font-mono border transition-colors ${
              vaporizerOn
                ? 'bg-violet-900 border-violet-500 text-violet-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-violet-700'
            }`}>
            {vaporizerOn ? 'ENCENDIDO' : 'APAGADO'}
          </button>
        </div>
        {mode === 'vaporizer_leak' && (
          <div className="text-xs font-mono text-amber-400 bg-amber-950 border border-amber-900 rounded px-2 py-1.5 mb-3">
            FUGA DETECTADA — Concentracion inestable
          </div>
        )}
        <SliderRow label="Concentracion" value={agentConcentration}
          min={0} max={8} step={0.1} unit="vol%" color="#a855f7"
          onChange={setAgentConcentration} disabled={!vaporizerOn} />
        <div className="text-xs font-mono text-slate-600 text-center mt-1">
          Agente anestesico volatil (e.g. Sevoflurano)
        </div>
      </Card>

      <Card>
        <SectionTitle>Valvula Flush O₂</SectionTitle>
        <button
          onMouseDown={() => setO2FlushActive(true)}
          onMouseUp={() => setO2FlushActive(false)}
          onMouseLeave={() => setO2FlushActive(false)}
          onTouchStart={() => setO2FlushActive(true)}
          onTouchEnd={() => setO2FlushActive(false)}
          className={`w-full py-3.5 rounded-lg font-bold font-mono text-xs uppercase tracking-widest transition-all select-none border-2 ${
            o2FlushActive
              ? 'bg-green-600 border-green-400 text-white scale-[0.97]'
              : 'bg-slate-900 border-slate-700 text-green-400 hover:border-green-700'
          }`}>
          {o2FlushActive ? 'FLUSH ACTIVO — 50 L/min' : 'MANTENER PRESIONADO'}
        </button>
        <div className="text-xs font-mono text-slate-600 text-center mt-2 leading-tight">
          Flujo directo O₂ al circuito · 35-75 L/min
          <br />Bypasea rotametros y vaporizador
        </div>
      </Card>
    </div>
  )
}
