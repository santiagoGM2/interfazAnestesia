import React from 'react'
import { useAnesthesiaStore } from '../../store/useAnesthesiaStore'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-3">{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">
      {children}
    </h3>
  )
}

function StepControl({ label, value, min, max, step, unit, onChange, color = '#60a5fa' }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; color?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/50">
      <span className="text-xs font-mono text-slate-400 shrink-0 w-24">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-bold leading-none">
          -
        </button>
        <span className="text-sm font-bold font-mono tabular-nums w-20 text-center" style={{ color }}>
          {step < 1 ? value.toFixed(1) : value}&nbsp;<span className="text-xs font-normal opacity-60">{unit}</span>
        </span>
        <button onClick={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-bold leading-none">
          +
        </button>
      </div>
    </div>
  )
}

export function VentilatorPanel() {
  const {
    ventilatorOn, toggleVentilator,
    tidalVolume, setTidalVolume,
    respiratoryRate, setRespiratoryRate,
    ieRatioI, ieRatioE, setIeRatio,
    inspPressureLimit, setInspPressureLimit,
    ventPhase, breathProgress,
    canisterSaturation, resetCanister,
    mode,
  } = useAnesthesiaStore()

  const cycleSec = 60 / respiratoryRate
  const inspSec = (cycleSec * ieRatioI / (ieRatioI + ieRatioE)).toFixed(2)
  const expSec  = (cycleSec * ieRatioE / (ieRatioI + ieRatioE)).toFixed(2)
  const mv      = ((tidalVolume / 1000) * respiratoryRate).toFixed(2)
  const canCol  = canisterSaturation < 50 ? '#22c55e' : canisterSaturation < 75 ? '#f59e0b' : canisterSaturation < 90 ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col gap-0">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Ventilador Mecanico</SectionTitle>
          <button onClick={toggleVentilator}
            className={`px-3 py-1 rounded text-xs font-bold font-mono border transition-colors ${
              ventilatorOn
                ? 'bg-blue-900 border-blue-500 text-blue-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-700'
            }`}>
            {ventilatorOn ? 'DETENER' : 'INICIAR'}
          </button>
        </div>

        {ventilatorOn && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-slate-500">Fase actual</span>
              <span className={`text-xs font-bold font-mono ${
                ventPhase === 'inspiration' ? 'text-blue-400' : 'text-orange-400'
              }`}>
                {ventPhase === 'inspiration' ? 'INSPIRACION' : 'ESPIRACION'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
              <div className="h-full rounded-full transition-none"
                style={{
                  width: `${breathProgress * 100}%`,
                  background: ventPhase === 'inspiration'
                    ? 'linear-gradient(90deg,#1d4ed8,#0891b2)'
                    : 'linear-gradient(90deg,#c2410c,#d97706)',
                }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-xs font-mono text-blue-500">Ti {inspSec}s</span>
              <span className="text-xs font-mono text-orange-500">Te {expSec}s</span>
            </div>
          </div>
        )}

        <StepControl label="Vol. Tidal" value={tidalVolume} min={50} max={1500} step={25} unit="mL" onChange={setTidalVolume} />
        <StepControl label="Frec. Resp." value={respiratoryRate} min={2} max={40} step={1} unit="rpm" onChange={setRespiratoryRate} />

        <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/50">
          <span className="text-xs font-mono text-slate-400 shrink-0 w-24">Relacion I:E</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(e => (
              <button key={e} onClick={() => setIeRatio(1, e)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  ieRatioE === e ? 'bg-blue-800 text-blue-200 border border-blue-600' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}>
                1:{e}
              </button>
            ))}
          </div>
        </div>

        <StepControl label="P. Limite" value={inspPressureLimit} min={10} max={80} step={5} unit="cmH₂O"
          onChange={setInspPressureLimit}
          color={inspPressureLimit > 60 ? '#ef4444' : '#60a5fa'} />

        {ventilatorOn && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Vent. Minuto', val: `${mv} L/min`, col: '#06b6d4' },
              { label: 'T. Ciclo', val: `${cycleSec.toFixed(1)}s`, col: '#06b6d4' },
            ].map(({ label, val, col }) => (
              <div key={label} className="bg-slate-950 rounded px-2 py-1.5 text-center">
                <div className="text-xs font-mono text-slate-600">{label}</div>
                <div className="text-sm font-bold font-mono" style={{ color: col }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Canister CO₂ */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Absorbedor CO₂ (Cal Sodada)</SectionTitle>
          <button onClick={resetCanister}
            className="px-2 py-1 text-xs font-mono rounded bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700">
            Reemplazar
          </button>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs font-mono text-slate-500">Saturacion</span>
          <span className="text-xs font-bold font-mono" style={{ color: canCol }}>
            {canisterSaturation.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-950 overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${canisterSaturation}%`, background: canCol }} />
        </div>
        <div className={`text-xs font-mono text-center py-1.5 rounded border leading-tight ${
          canisterSaturation < 50  ? 'text-green-400 bg-green-950 border-green-900' :
          canisterSaturation < 75  ? 'text-amber-400 bg-amber-950 border-amber-900' :
          canisterSaturation < 90  ? 'text-orange-400 bg-orange-950 border-orange-900' :
                                     'text-red-400 bg-red-950 border-red-900'
        }`}>
          {canisterSaturation < 50 ? 'Cal sodada funcional' :
           canisterSaturation < 75 ? 'Reemplazo proximo recomendado' :
           canisterSaturation < 90 ? 'REEMPLAZAR CAL SODADA' :
                                     'SATURADO — Riesgo de hipercapnia'}
        </div>
      </Card>

      {/* Mode status */}
      {mode !== 'normal' && (
        <div className="bg-red-950 border border-red-900 rounded-lg p-3">
          <div className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider mb-1">
            Modo de Falla Activo
          </div>
          <div className="text-xs font-mono text-red-300 leading-snug">
            {mode === 'o2_failure' && 'Falla presion O₂ — Fail-safe activo, N₂O bloqueado'}
            {mode === 'circuit_leak' && 'Fuga circuito respiratorio — Perdida de volumen corriente'}
            {mode === 'vaporizer_leak' && 'Fuga vaporizador — Concentracion agente inestable'}
          </div>
        </div>
      )}
    </div>
  )
}
