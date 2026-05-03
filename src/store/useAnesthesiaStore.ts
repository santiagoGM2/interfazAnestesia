import { create } from 'zustand'
import { calculateGasMix, isFailSafeTriggered, canisterSaturationIncrement, isHypoxicMixture } from '../utils/gasCalculations'

export type OperatingMode = 'normal' | 'o2_failure' | 'circuit_leak' | 'vaporizer_leak'
export type VentPhase = 'inspiration' | 'expiration' | 'off'
export type AlertSeverity = 'info' | 'warning' | 'danger'

export interface Alert {
  id: string
  message: string
  severity: AlertSeverity
  timestamp: number
}

interface State {
  // Pressures PSIG
  o2Pressure: number
  n2oPressure: number

  // Flows L/min
  o2Flow: number
  n2oFlow: number

  // Vaporizer
  vaporizerOn: boolean
  agentConcentration: number

  // O2 Flush
  o2FlushActive: boolean

  // Ventilator
  ventilatorOn: boolean
  tidalVolume: number
  respiratoryRate: number
  ieRatioI: number
  ieRatioE: number
  inspPressureLimit: number

  // Mode
  mode: OperatingMode

  // Computed
  failSafeActive: boolean
  fio2: number
  fn2o: number
  agentFraction: number
  totalFGF: number
  o2FlushFlow: number

  // Canister
  canisterSaturation: number

  // Vent cycle
  ventPhase: VentPhase
  breathProgress: number

  // Alerts
  alerts: Alert[]
}

interface Actions {
  setO2Flow: (v: number) => void
  setN2oFlow: (v: number) => void
  setVaporizerOn: (v: boolean) => void
  setAgentConcentration: (v: number) => void
  setO2FlushActive: (v: boolean) => void
  toggleVentilator: () => void
  setTidalVolume: (v: number) => void
  setRespiratoryRate: (v: number) => void
  setIeRatio: (i: number, e: number) => void
  setInspPressureLimit: (v: number) => void
  setMode: (m: OperatingMode) => void
  updateVentCycle: (phase: VentPhase, progress: number) => void
  tickCanister: (dt: number) => void
  resetCanister: () => void
  addAlert: (message: string, severity: AlertSeverity) => void
  dismissAlert: (id: string) => void
}

type Store = State & Actions

const ALERT_IDS = {
  HYPOXIC: 'hypoxic',
  FAILSAFE: 'failsafe',
  CANISTER: 'canister',
  LOW_O2: 'low_o2',
  CIRCUIT_LEAK: 'circuit_leak',
  VAPORIZER_LEAK: 'vaporizer_leak',
}

function recompute(state: Partial<State>): Partial<State> {
  const s = state as State
  const failSafeActive = isFailSafeTriggered(s.o2Pressure ?? 50, s.mode ?? 'normal')
  const mix = calculateGasMix(
    s.o2Flow ?? 0,
    s.n2oFlow ?? 0,
    s.agentConcentration ?? 0,
    s.vaporizerOn ?? false,
    s.o2FlushActive ?? false,
    failSafeActive
  )
  return {
    failSafeActive,
    fio2: mix.fio2,
    fn2o: mix.fn2o,
    agentFraction: mix.agentFraction,
    totalFGF: mix.totalFGF,
    o2FlushFlow: mix.o2FlushFlow,
  }
}

export const useAnesthesiaStore = create<Store>((set, get) => ({
  // Initial state
  o2Pressure: 50,
  n2oPressure: 50,
  o2Flow: 2,
  n2oFlow: 4,
  vaporizerOn: false,
  agentConcentration: 2,
  o2FlushActive: false,
  ventilatorOn: false,
  tidalVolume: 500,
  respiratoryRate: 12,
  ieRatioI: 1,
  ieRatioE: 2,
  inspPressureLimit: 30,
  mode: 'normal',
  failSafeActive: false,
  fio2: 0.33,
  fn2o: 0.67,
  agentFraction: 0,
  totalFGF: 6,
  o2FlushFlow: 0,
  canisterSaturation: 0,
  ventPhase: 'off',
  breathProgress: 0,
  alerts: [],

  setO2Flow: (v) => set((s) => ({ o2Flow: v, ...recompute({ ...s, o2Flow: v }) })),
  setN2oFlow: (v) => set((s) => ({ n2oFlow: v, ...recompute({ ...s, n2oFlow: v }) })),
  setVaporizerOn: (v) => set((s) => ({ vaporizerOn: v, ...recompute({ ...s, vaporizerOn: v }) })),
  setAgentConcentration: (v) => set((s) => ({ agentConcentration: v, ...recompute({ ...s, agentConcentration: v }) })),
  setO2FlushActive: (v) => set((s) => ({ o2FlushActive: v, ...recompute({ ...s, o2FlushActive: v }) })),
  toggleVentilator: () =>
    set((s) => {
      const ventilatorOn = !s.ventilatorOn
      return { ventilatorOn, ventPhase: ventilatorOn ? 'inspiration' : 'off', breathProgress: 0 }
    }),
  setTidalVolume: (v) => set({ tidalVolume: v }),
  setRespiratoryRate: (v) => set({ respiratoryRate: v }),
  setIeRatio: (i, e) => set({ ieRatioI: i, ieRatioE: e }),
  setInspPressureLimit: (v) => set({ inspPressureLimit: v }),

  setMode: (m) => {
    set((s) => {
      const o2Pressure = m === 'o2_failure' ? 10 : 50
      const n2oPressure = m === 'n2o_failure' ? 10 : 50
      const next = { ...s, mode: m, o2Pressure, n2oPressure }
      const computed = recompute(next)
      const alerts = [...s.alerts.filter(a => !['failsafe','low_o2','circuit_leak','vaporizer_leak'].includes(a.id))]

      if (m === 'o2_failure') {
        alerts.push({ id: ALERT_IDS.FAILSAFE, message: '⚠ FAIL-SAFE ACTIVO: N₂O cortado por baja presión de O₂', severity: 'danger', timestamp: Date.now() })
        alerts.push({ id: ALERT_IDS.LOW_O2, message: '⚠ PRESIÓN O₂ BAJA (10 PSIG) — Revisar fuente de gas', severity: 'danger', timestamp: Date.now() })
      }
      if (m === 'circuit_leak') {
        alerts.push({ id: ALERT_IDS.CIRCUIT_LEAK, message: '⚠ FUGA EN CIRCUITO — Presión de vía aérea insuficiente', severity: 'warning', timestamp: Date.now() })
      }
      if (m === 'vaporizer_leak') {
        alerts.push({ id: ALERT_IDS.VAPORIZER_LEAK, message: '⚠ FUGA EN VAPORIZADOR — Concentración de agente inestable', severity: 'warning', timestamp: Date.now() })
      }

      return { ...next, ...computed, alerts }
    })
  },

  updateVentCycle: (phase, progress) => set({ ventPhase: phase, breathProgress: progress }),

  tickCanister: (dt) => {
    const s = get()
    if (!s.ventilatorOn) return
    const inc = canisterSaturationIncrement(s.respiratoryRate, s.tidalVolume, dt)
    const newSat = Math.min(100, s.canisterSaturation + inc)

    set((st) => {
      const alerts = [...st.alerts]
      if (newSat >= 75 && !alerts.find(a => a.id === ALERT_IDS.CANISTER)) {
        alerts.push({ id: ALERT_IDS.CANISTER, message: '⚠ CANISTER CO₂ al 75% — Reemplazar cal sodada pronto', severity: 'warning', timestamp: Date.now() })
      }
      if (newSat >= 95 && !alerts.find(a => a.id === 'canister_crit')) {
        alerts.push({ id: 'canister_crit', message: '🔴 CANISTER SATURADO — Riesgo de hipercapnia', severity: 'danger', timestamp: Date.now() })
      }
      return { canisterSaturation: newSat, alerts }
    })
  },

  resetCanister: () => set((s) => ({
    canisterSaturation: 0,
    alerts: s.alerts.filter(a => a.id !== ALERT_IDS.CANISTER && a.id !== 'canister_crit')
  })),

  addAlert: (message, severity) => {
    const id = `alert_${Date.now()}`
    set((s) => ({ alerts: [...s.alerts, { id, message, severity, timestamp: Date.now() }] }))
  },

  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter(a => a.id !== id) })),
}))
