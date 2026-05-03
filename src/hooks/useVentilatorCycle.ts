import { useEffect, useRef } from 'react'
import { useAnesthesiaStore } from '../store/useAnesthesiaStore'

export function useVentilatorCycle() {
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)

  useEffect(() => {
    const loop = (timestamp: number) => {
      const store = useAnesthesiaStore.getState()
      if (!store.ventilatorOn) {
        store.updateVentCycle('off', 0)
        lastTimeRef.current = 0
        elapsedRef.current = 0
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      store.tickCanister(dt)

      const { respiratoryRate, ieRatioI, ieRatioE } = store
      const cycleDuration = 60 / respiratoryRate
      const inspFrac = ieRatioI / (ieRatioI + ieRatioE)
      const inspDuration = cycleDuration * inspFrac
      const expDuration = cycleDuration * (1 - inspFrac)

      elapsedRef.current += dt
      const cycleTime = elapsedRef.current % cycleDuration
      const isInspiration = cycleTime < inspDuration

      if (isInspiration) {
        const progress = cycleTime / inspDuration
        store.updateVentCycle('inspiration', progress)
      } else {
        const progress = (cycleTime - inspDuration) / expDuration
        store.updateVentCycle('expiration', progress)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
}
