export interface GasMix {
  fio2: number
  fn2o: number
  agentFraction: number
  totalFGF: number
  o2FlushFlow: number
}

export function calculateGasMix(
  o2Flow: number,
  n2oFlow: number,
  agentConc: number,
  vaporizerOn: boolean,
  o2FlushActive: boolean,
  failSafeActive: boolean
): GasMix {
  const effectiveN2oFlow = failSafeActive ? 0 : n2oFlow
  const flushFlow = o2FlushActive ? 50 : 0

  if (o2FlushActive) {
    return { fio2: 1.0, fn2o: 0, agentFraction: 0, totalFGF: 50, o2FlushFlow: 50 }
  }

  const totalFlow = o2Flow + effectiveN2oFlow
  if (totalFlow === 0) {
    return { fio2: 0, fn2o: 0, agentFraction: 0, totalFGF: 0, o2FlushFlow: flushFlow }
  }

  const agentFrac = vaporizerOn ? agentConc / 100 : 0
  const dilution = 1 - agentFrac
  const fio2 = (o2Flow / totalFlow) * dilution
  const fn2o = (effectiveN2oFlow / totalFlow) * dilution

  return { fio2, fn2o, agentFraction: agentFrac, totalFGF: totalFlow, o2FlushFlow: flushFlow }
}

export function isFailSafeTriggered(o2Pressure: number, mode: string): boolean {
  if (mode === 'o2_failure') return true
  return o2Pressure < 26
}

export function isHypoxicMixture(fio2: number): boolean {
  return fio2 > 0 && fio2 < 0.21
}

export function canisterSaturationIncrement(rr: number, tidalVolume: number, dt: number): number {
  // VCO2 production ~200 mL/min. Canister holds ~100L CO2
  const vco2PerMin = 0.2
  const canisterCapacityL = 100
  return (vco2PerMin / canisterCapacityL) * dt * 60 * 100
}

export function getCanisterColor(saturation: number): string {
  if (saturation < 50) return '#4ade80'
  if (saturation < 75) return '#facc15'
  if (saturation < 90) return '#fb923c'
  return '#ef4444'
}

export function getMixColor(fio2: number, fn2o: number, agentFrac: number): string {
  if (agentFrac > 0.02) return '#a78bfa'
  if (fn2o > 0.5) return '#60a5fa'
  if (fio2 > 0.8) return '#4ade80'
  return '#22d3ee'
}

export function pressureToPercent(pressure: number, max: number): number {
  return Math.min(100, Math.max(0, (pressure / max) * 100))
}
