import React from 'react'
import { useAnesthesiaStore } from '../../store/useAnesthesiaStore'

export function AlertPanel() {
  const { alerts, dismissAlert } = useAnesthesiaStore()

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-5 py-2 bg-slate-950 border-t border-slate-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-xs font-mono text-green-500 tracking-wide">
          Sistema operando dentro de parametros normales
        </span>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border-t border-slate-800 max-h-24 overflow-y-auto">
      {alerts.map(alert => (
        <div key={alert.id}
          className={`flex items-center justify-between gap-3 px-5 py-1.5 border-b border-slate-900 ${
            alert.severity === 'danger'  ? 'bg-red-950/50' :
            alert.severity === 'warning' ? 'bg-amber-950/40' :
                                           'bg-blue-950/40'
          }`}>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              alert.severity === 'danger'  ? 'bg-red-400' :
              alert.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
            }`} />
            <span className={`text-xs font-mono ${
              alert.severity === 'danger'  ? 'text-red-300' :
              alert.severity === 'warning' ? 'text-amber-300' : 'text-blue-300'
            }`}>
              {alert.message}
            </span>
          </div>
          <button onClick={() => dismissAlert(alert.id)}
            className="text-slate-600 hover:text-slate-300 text-xs font-mono shrink-0 px-1">
            X
          </button>
        </div>
      ))}
    </div>
  )
}
