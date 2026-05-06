import React, { useState, useCallback, useRef } from 'react'
import { useAnesthesiaStore } from '../../store/useAnesthesiaStore'
import { getCanisterColor, getMixColor } from '../../utils/gasCalculations'

// ── Color palette ────────────────────────────────────────────
const C = {
  o2:      '#22c55e',
  n2o:     '#3b82f6',
  mix:     '#06b6d4',
  agent:   '#a855f7',
  co2:     '#f59e0b',
  exp:     '#f97316',
  pipe:    '#2d5a8e',
  label:   '#7a93b4',
  dim:     '#2d4a6e',
  text:    '#dce8f8',
  bg:      '#060e1c',
  panel:   '#091525',
  border:  '#1a3050',
  ok:      '#22c55e',
  warn:    '#f59e0b',
  danger:  '#ef4444',
  white:   '#e2e8f0',
}

// ── Primitives ───────────────────────────────────────────────

function Pipe({ d, w = 2.5 }: { d: string; w?: number }) {
  return <path d={d} fill="none" stroke={C.pipe} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
}

function Flow({ d, color, active, speed = 1, rev = false, w = 3.5 }: {
  d: string; color: string; active: boolean; speed?: number; rev?: boolean; w?: number
}) {
  if (!active) return null
  const dur = Math.max(0.2, 2.2 / speed)
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"
      strokeDasharray="10 6"
      style={{ animation: `flowMove ${dur}s linear infinite ${rev ? 'reverse' : 'normal'}` }}
    />
  )
}

function Txt({ x, y, t, a = 'middle', s = 9, c = C.label, b = false, mono = true }: {
  x: number; y: number; t: string; a?: string; s?: number; c?: string; b?: boolean; mono?: boolean
}) {
  return (
    <text x={x} y={y} textAnchor={a as any} fill={c} fontSize={s}
      fontFamily={mono ? 'ui-monospace,Consolas,monospace' : 'system-ui,sans-serif'}
      fontWeight={b ? 'bold' : 'normal'}>
      {t}
    </text>
  )
}

// ── Pressure gauge ───────────────────────────────────────────
function Gauge({ cx, cy, r = 15, psi, max, name }: {
  cx: number; cy: number; r?: number; psi: number; max: number; name: string
}) {
  const pct = Math.min(1, psi / max)
  const ang = -135 + pct * 270
  const rad = ang * Math.PI / 180
  const nx = cx + (r - 4) * Math.cos(rad)
  const ny = cy + (r - 4) * Math.sin(rad)
  const nc = psi < 26 ? C.danger : psi < 40 ? C.warn : C.ok
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.bg} stroke={C.dim} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r - 3} fill="#040b14" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={nc} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2} fill={nc} />
      <Txt x={cx} y={cy + r + 10} t={name} s={7} />
      <Txt x={cx} y={cy + r + 19} t={`${psi}PSI`} s={7.5} c={nc} b />
    </g>
  )
}

// ── Regulator symbol ─────────────────────────────────────────
function Reg({ cx, cy, r = 13, label }: { cx: number; cy: number; r?: number; label: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.bg} stroke={C.dim} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r - 4} fill={C.panel} stroke={C.border} strokeWidth={1} />
      <Txt x={cx} y={cy + r + 10} t={label} s={7} />
    </g>
  )
}

// ── Fail-safe valve ──────────────────────────────────────────
function FailSafe({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  const col = active ? C.danger : C.ok
  return (
    <g>
      <rect x={cx - 20} y={cy - 22} width={40} height={44} rx={3}
        fill={C.bg} stroke={col} strokeWidth={active ? 2.5 : 1.5} />
      <Txt x={cx} y={cy - 9} t="FAIL" s={8} c={col} b />
      <Txt x={cx} y={cy + 2} t="SAFE" s={8} c={col} b />
      <Txt x={cx} y={cy + 14} t={active ? 'CERRADO' : 'ABIERTO'} s={7} c={col} />
      {active && (
        <line x1={cx - 14} y1={cy - 22} x2={cx + 14} y2={cy + 22}
          stroke={C.danger} strokeWidth={2} opacity={0.7} />
      )}
      {/* Circle label A */}
      <circle cx={cx + 24} cy={cy - 26} r={8} fill={C.bg} stroke={C.label} strokeWidth={1} />
      <Txt x={cx + 24} y={cy - 22} t="A" s={8} c={C.label} />
    </g>
  )
}

// ── Check valve ──────────────────────────────────────────────
function CheckV({ cx, cy, open, dir = 'R' }: {
  cx: number; cy: number; open: boolean; dir?: 'R' | 'L' | 'U' | 'D'
}) {
  const col = open ? C.ok : C.dim
  const rots = { R: 0, L: 180, U: -90, D: 90 }
  return (
    <g transform={`rotate(${rots[dir]},${cx},${cy})`}>
      <circle cx={cx} cy={cy} r={8} fill={C.bg} stroke={col} strokeWidth={1.5} />
      <line x1={cx - 3} y1={cy - 5} x2={cx - 3} y2={cy + 5} stroke={col} strokeWidth={1.5} />
      <polygon
        points={`${cx - 1},${cy - 5} ${cx + 5},${cy} ${cx - 1},${cy + 5}`}
        fill={open ? col : C.bg} stroke={col} strokeWidth={1} />
    </g>
  )
}

// ── Pressure Relief Valve (D) ────────────────────────────────
function PressureReliefValve({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  const col = active ? C.danger : C.warn
  return (
    <g>
      {active && (
        <circle cx={cx} cy={cy} r={16} fill="none" stroke={C.danger} strokeWidth={2}>
          <animate attributeName="r" values="16;30;16" dur="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Valve body */}
      <circle cx={cx} cy={cy} r={16} fill={C.bg} stroke={col} strokeWidth={active ? 2.5 : 1.8} />
      {/* Piston */}
      <rect x={cx - 7} y={cy - 11} width={14} height={6} rx={1.5}
        fill={active ? C.danger : C.dim} stroke={col} strokeWidth={1} />
      {/* Stem */}
      <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke={col} strokeWidth={1.5} />
      {/* Spring zigzag */}
      <polyline
        points={`${cx - 7},${cy + 5} ${cx - 2},${cy + 10} ${cx + 2},${cy + 5} ${cx + 7},${cy + 10}`}
        fill="none" stroke={col} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* D badge */}
      <circle cx={cx + 22} cy={cy - 22} r={8} fill={C.bg} stroke={C.label} strokeWidth={1} />
      <Txt x={cx + 22} y={cy - 18} t="D" s={8} c={C.label} />
      {/* Labels */}
      <Txt x={cx + 34} y={cy - 8} t="VALV. ALIVIO" s={7.5} a="start" c={col} />
      <Txt x={cx + 34} y={cy + 3} t="PRESIÓN" s={7.5} a="start" c={col} />
      <Txt x={cx + 34} y={cy + 14} t="135 mmHg" s={6} a="start" c={C.dim} />
      {active && (
        <Txt x={cx} y={cy - 36} t="ALIVIO ACTIVO" s={7.5} c={C.danger} b />
      )}
    </g>
  )
}

// ── Rotameter tube ───────────────────────────────────────────
function Rotameter({ cx, yt, yb, flow, max, col, label }: {
  cx: number; yt: number; yb: number; flow: number; max: number; col: string; label: string
}) {
  const h = yb - yt
  const w = 28
  const pct = Math.min(1, Math.max(0, flow / max))
  const fy = yb - 8 - pct * (h - 20)
  const x = cx - w / 2

  return (
    <g>
      {/* Glass tube */}
      <path d={`M${x},${yb} L${x - 3},${yt} L${x + w + 3},${yt} L${x + w},${yb} Z`}
        fill={C.bg} stroke={C.dim} strokeWidth={1.5} />
      {/* Gas fill */}
      {flow > 0 && (
        <>
          <clipPath id={`rc-${label}`}>
            <path d={`M${x},${yb} L${x - 3},${yt} L${x + w + 3},${yt} L${x + w},${yb} Z`} />
          </clipPath>
          <rect x={x - 4} y={fy + 7} width={w + 8} height={yb - fy - 7}
            fill={col} opacity={0.14} clipPath={`url(#rc-${label})`} />
        </>
      )}
      {/* Float */}
      <circle cx={cx} cy={fy} r={w / 2 - 3}
        fill={flow > 0 ? col : C.dim} stroke={flow > 0 ? col : C.border}
        strokeWidth={1} opacity={flow > 0 ? 0.9 : 0.4} />
      {/* Scale */}
      {[0, 3, 6, 9, 12].map(v => {
        const sy = yb - 8 - (v / max) * (h - 16)
        return (
          <g key={v}>
            <line x1={x + w + 3} y1={sy} x2={x + w + 8} y2={sy} stroke={C.dim} strokeWidth={1} />
            <Txt x={x + w + 14} y={sy + 3} t={String(v)} s={7} a="start" />
          </g>
        )
      })}
      {/* Labels */}
      <Txt x={cx} y={yb + 15} t={label} s={11} c={col} b />
      <Txt x={cx} y={yb + 27} t={`${flow.toFixed(1)} L/min`} s={9} c={C.white} />
    </g>
  )
}

// ── Vaporizer ─────────────────────────────────────────────────
function Vaporizer({ x, y, on, conc }: { x: number; y: number; on: boolean; conc: number }) {
  const bc = on ? C.agent : C.dim
  const fh = (conc / 8) * 70
  const da = -140 + (conc / 8) * 280
  const dr = da * Math.PI / 180
  return (
    <g>
      {/* Body */}
      <rect x={x} y={y} width={100} height={170} rx={5}
        fill={C.panel} stroke={bc} strokeWidth={on ? 2 : 1.5} />
      <Txt x={x + 50} y={y + 13} t="VAPORIZADOR" s={8} c={bc} b />
      <Txt x={x + 50} y={y + 23} t="CALIBRADO" s={7} c={C.label} />
      {/* Reservoir */}
      <rect x={x + 8} y={y + 30} width={48} height={80} rx={2}
        fill={C.bg} stroke={C.dim} strokeWidth={1} />
      <rect x={x + 8} y={y + 30 + 80 - fh} width={48} height={fh}
        rx={1} fill={C.agent} opacity={0.35} />
      <Txt x={x + 32} y={y + 72} t="AGENTE" s={7} c={C.label} />
      {/* Dial */}
      <circle cx={x + 78} cy={y + 58} r={18}
        fill={C.bg} stroke={bc} strokeWidth={on ? 2 : 1.5} />
      <line
        x1={x + 78} y1={y + 58}
        x2={x + 78 + 14 * Math.cos(dr)}
        y2={y + 58 + 14 * Math.sin(dr)}
        stroke={bc} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x + 78} cy={y + 58} r={3} fill={bc} />
      <Txt x={x + 78} y={y + 84} t={`${conc.toFixed(1)}%`} s={9} c={on ? C.agent : C.label} />
      {/* On/Off */}
      <circle cx={x + 78} cy={y + 102} r={9}
        fill={on ? '#14532d' : C.dim} stroke={on ? C.ok : C.border} strokeWidth={1} />
      <Txt x={x + 78} y={y + 106} t={on ? 'ON' : 'OFF'} s={7} c={on ? C.ok : C.label} b />
      {/* Interlock */}
      <rect x={x + 8} y={y + 120} width={84} height={14}
        rx={2} fill={C.bg} stroke={C.dim} strokeWidth={1} />
      <Txt x={x + 50} y={y + 130} t="INTERLOCK" s={7} c={C.dim} />
      {/* Concentration-calibrated label */}
      <Txt x={x + 50} y={y + 152} t="CONC. CALIBRADA" s={7} c={C.label} />
    </g>
  )
}

// ── Canister ─────────────────────────────────────────────────
function Canister({ x, y, sat }: { x: number; y: number; sat: number }) {
  const col = getCanisterColor(sat)
  const fh = (sat / 100) * 68
  return (
    <g>
      <rect x={x} y={y} width={60} height={88} rx={4}
        fill={C.panel} stroke={col} strokeWidth={2} />
      <rect x={x + 5} y={y + 15 + (68 - fh)} width={50} height={fh}
        rx={2} fill={col} opacity={0.45} />
      <Txt x={x + 30} y={y + 11} t="CO" s={7} c={col} b />
      <text x={x + 41} y={y + 11} fill={col} fontSize={6} fontFamily="monospace">2</text>
      {/* Granules */}
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col2 => (
          <circle key={`${row}-${col2}`}
            cx={x + 14 + col2 * 16} cy={y + 30 + row * 18} r={5}
            fill={sat > (row * 33 + col2 * 11) ? col : C.dim} opacity={0.7} />
        ))
      )}
      <Txt x={x + 30} y={y + 100} t={`${sat.toFixed(0)}%`} s={8} c={col} />
    </g>
  )
}

// ── Bellows ───────────────────────────────────────────────────
function Bellows({ x, y, phase, prog }: {
  x: number; y: number; phase: string; prog: number
}) {
  const maxH = 80, minH = 18
  let bh: number
  if (phase === 'inspiration') bh = maxH - (maxH - minH) * prog
  else if (phase === 'expiration') bh = minH + (maxH - minH) * prog
  else bh = maxH
  const lines = Math.max(2, Math.floor(bh / 9))
  return (
    <g>
      <Txt x={x + 28} y={y - 6} t="MUELLE" s={8} c={C.label} />
      <rect x={x} y={y + (maxH - bh)} width={56} height={bh}
        rx={3} fill={C.panel} stroke="#2563eb" strokeWidth={1.5} />
      {Array.from({ length: lines }).map((_, i) => (
        <line key={i}
          x1={x + 4} y1={y + (maxH - bh) + i * (bh / lines) + 4}
          x2={x + 52} y2={y + (maxH - bh) + i * (bh / lines) + 4}
          stroke="#1d4ed8" strokeWidth={1} />
      ))}
      <rect x={x - 4} y={y + (maxH - bh) - 4} width={64} height={6}
        rx={2} fill={C.dim} />
      <Txt x={x + 28} y={y + maxH + 13}
        t={phase === 'off' ? 'DETENIDO' : phase === 'inspiration' ? 'INSPIRACION' : 'ESPIRACION'}
        s={7} c={phase === 'inspiration' ? '#60a5fa' : phase === 'expiration' ? '#fb923c' : C.label} />
    </g>
  )
}

// ── Cylinder symbol ───────────────────────────────────────────
function Cylinder({ x, y, w, h, col, label }: {
  x: number; y: number; w: number; h: number; col: string; label: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={C.panel} stroke={col} strokeWidth={1.5} />
      <rect x={x + w * 0.3} y={y - 8} width={w * 0.4} height={10}
        rx={2} fill={C.panel} stroke={col} strokeWidth={1.5} />
      <Txt x={x + w / 2} y={y + h / 2 + 4} t={label} s={10} c={col} b />
    </g>
  )
}

// ── Box label ─────────────────────────────────────────────────
function BoxLabel({ x, y, w = 140, h = 20, label, sub }: {
  x: number; y: number; w?: number; h?: number; label: string; sub?: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill={C.panel} stroke={C.border} strokeWidth={1} />
      <Txt x={x + w / 2} y={y + h / 2 + 3.5} t={label} s={7.5} />
      {sub && <Txt x={x + w / 2} y={y + h + 9} t={sub} s={6.5} c={C.dim} />}
    </g>
  )
}

// ── Main diagram ──────────────────────────────────────────────
export function AnesthesiaDiagram() {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(3, Math.max(0.3, s * (e.deltaY > 0 ? 0.9 : 1.1))))
  }, [])

  const onDown = useCallback((e: React.MouseEvent) => {
    setDrag({ mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y })
  }, [offset])

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!drag) return
    setOffset({ x: drag.ox + e.clientX - drag.mx, y: drag.oy + e.clientY - drag.my })
  }, [drag])

  const onUp = useCallback(() => setDrag(null), [])

  const resetView = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }) }, [])

  // ── Store ──
  const {
    o2Pressure, n2oPressure,
    o2Flow, n2oFlow,
    vaporizerOn, agentConcentration,
    o2FlushActive, failSafeActive,
    fio2, fn2o, agentFraction, totalFGF,
    mode, ventPhase, breathProgress,
    canisterSaturation, ventilatorOn,
    pressureReliefActive,
  } = useAnesthesiaStore()

  const flowOn = totalFGF > 0 || o2FlushActive
  const mixCol = getMixColor(fio2, fn2o, agentFraction)
  const spd = Math.max(0.6, totalFGF / 3)
  const isInsp = ventPhase === 'inspiration'
  const isExp = ventPhase === 'expiration'
  const hypoxic = fio2 > 0 && fio2 < 0.21
  const circLeak = mode === 'circuit_leak'

  // ────────────────────────────────────────────────────────────
  // SVG coordinate constants
  // ────────────────────────────────────────────────────────────
  // N₂O main line: y = 138
  // O₂ main line:  y = 490
  // N₂O rotameter center-x: 534
  // O₂ rotameter center-x:  586
  // Rotameter top: y = 188, bottom: y = 455
  // Vaporizer: x = 660, y = 55
  // Outlet: x = 790+
  // Patient circuit: x = 940+

  const NY = 138  // N₂O line Y
  const OY = 490  // O₂ line Y
  const NRX = 534 // N₂O rotameter X
  const ORX = 586 // O₂ rotameter X
  const RT = 188  // Rotameter top Y
  const RB = 455  // Rotameter bottom Y

  return (
    <div className="relative w-full h-full" style={{ background: C.bg }}>
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button onClick={() => setScale(s => Math.min(3, s * 1.2))}
          className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 rounded text-lg font-bold hover:bg-slate-700 flex items-center justify-center">
          +
        </button>
        <button onClick={() => setScale(s => Math.max(0.3, s * 0.8))}
          className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-300 rounded text-lg font-bold hover:bg-slate-700 flex items-center justify-center">
          -
        </button>
        <button onClick={resetView}
          className="w-8 h-8 bg-slate-800 border border-slate-600 text-slate-400 rounded text-xs font-mono hover:bg-slate-700 flex items-center justify-center">
          1:1
        </button>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-3 left-3 z-10 text-xs font-mono text-slate-600">
        Rueda: zoom · Arrastrar: desplazar
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{ cursor: drag ? 'grabbing' : 'grab' }}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        <svg
          viewBox="0 0 1380 760"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}
            style={{ transformOrigin: '690px 380px' }}>

            {/* ═══════════════════════════════════════════
                STATIC PIPES
            ════════════════════════════════════════════ */}

            {/* N₂O cylinders to check valve */}
            <Pipe d={`M45,${NY - 50} V${NY - 20} H130 V${NY}`} />
            <Pipe d={`M95,${NY - 50} V${NY - 20}`} />
            {/* N₂O pipeline from top */}
            <Pipe d={`M185,0 V${NY}`} />
            {/* N₂O main horizontal line */}
            <Pipe d={`M130,${NY} H455`} w={3} />
            {/* N₂O line continues past regulator, through fail-safe, to 2nd stage */}
            {/* N₂O to rotameter: down from main line */}
            <Pipe d={`M455,${NY} V280 H${NRX},280 V${RB}`} />
            {/* Fail-safe O₂ pressure tap: vertical from O₂ line up to fail-safe */}
            <Pipe d={`M255,${OY} V${NY + 24}`} w={1.5} />

            {/* O₂ cylinders to regulator */}
            <Pipe d={`M45,520 V${OY + 20} H130 V${OY}`} />
            <Pipe d={`M95,520 V${OY + 20}`} />
            {/* O₂ pipeline from bottom */}
            <Pipe d={`M185,760 V${OY}`} />
            {/* O₂ main horizontal line */}
            <Pipe d={`M130,${OY} H455`} w={3} />
            {/* O₂ to rotameter: up from main line */}
            <Pipe d={`M455,${OY} V420 H${ORX} V${RB}`} />

            {/* Auxiliary O₂ branches (from x=310 on O₂ line) */}
            <Pipe d={`M310,${OY} V520`} w={1.5} />

            {/* Ventilator driving gas branch */}
            <Pipe d={`M220,${OY} V370 H50`} w={2} />

            {/* O₂ main line to ventilator (before on/off) also powers flush */}
            <Pipe d={`M220,${OY} V${OY + 110} H555 V680`} w={1.5} />

            {/* Rotameter tops to manifold */}
            <Pipe d={`M${NRX},${RT} V165 H605`} />
            <Pipe d={`M${ORX},${RT} V165 H605`} />
            {/* Manifold to vaporizer */}
            <Pipe d={`M605,165 H660`} w={3} />
            {/* Through vaporizer: enters left, exits right */}
            <Pipe d={`M660,128 H760`} w={3} />
            {/* Pressure relief (D) branch — from main line up to valve */}
            <Pipe d={`M790,128 V69`} w={2} />
            {/* Vent path from relief valve to muelle (dashed, always visible) */}
            <path d={`M790,69 H845 V270`} fill="none"
              stroke={pressureReliefActive ? C.warn : C.dim}
              strokeWidth={pressureReliefActive ? 2 : 1.5}
              strokeDasharray="5 3" opacity={0.75} />
            {/* Main outlet line continues */}
            <Pipe d={`M790,128 H880`} w={3} />
            {/* Outlet to patient circuit */}
            <Pipe d={`M880,128 H940`} w={3} />

            {/* O₂ flush path: from flush valve to common outlet */}
            <Pipe d={`M555,680 H920 V128`} w={2} />

            {/* ═══════════════════════════════════════════
                PATIENT CIRCUIT (right zone, x=940+)
            ════════════════════════════════════════════ */}
            {/* Main loop */}
            <Pipe d={`M940,128 H1280`} w={3} />       {/* Top insp limb */}
            <Pipe d={`M1280,128 V580`} w={3} />         {/* Right patient side */}
            <Pipe d={`M1280,580 H940`} w={3} />         {/* Bottom exp limb */}
            <Pipe d={`M940,580 V460`} w={3} />           {/* Left lower return */}
            <Pipe d={`M940,370 V128`} w={3} />           {/* Left upper insp */}

            {/* CO₂ canister connections (inside loop, left side) */}
            <Pipe d={`M940,460 V380 M940,370 V128`} w={3} />
            {/* Actually canister is in the loop bottom-left */}

            {/* Reservoir bag connection */}
            <Pipe d={`M940,460 H880`} w={2} />
            {/* APL valve connection */}
            <Pipe d={`M880,460 V520`} w={1.5} />

            {/* Ventilator bellows to circuit */}
            <Pipe d={`M870,310 H940`} w={2} />

            {/* ═══════════════════════════════════════════
                GAS FLOW ANIMATIONS
            ════════════════════════════════════════════ */}

            {/* N₂O from source */}
            <Flow d={`M130,${NY} H210`} color={C.n2o} active={n2oPressure > 26} speed={2} />
            <Flow d={`M230,${NY} H268`} color={C.n2o} active={n2oPressure > 26 && !failSafeActive} speed={2} />
            {/* N₂O past fail-safe to 2nd stage */}
            <Flow d={`M312,${NY} H375`} color={C.n2o} active={!failSafeActive && n2oFlow > 0} speed={n2oFlow} />
            <Flow d={`M395,${NY} H455`} color={C.n2o} active={!failSafeActive && n2oFlow > 0} speed={n2oFlow} />
            {/* N₂O down to rotameter */}
            <Flow d={`M455,${NY} V280 H${NRX} V${RB}`} color={C.n2o} active={!failSafeActive && n2oFlow > 0} speed={n2oFlow} />
            {/* N₂O through rotameter (upward) */}
            <Flow d={`M${NRX},${RB} V${RT}`} color={C.n2o} active={!failSafeActive && n2oFlow > 0} speed={n2oFlow} rev />

            {/* O₂ pressure tap to fail-safe (signal line) */}
            <Flow d={`M255,${OY} V${NY + 24}`} color={C.o2} active={o2Pressure > 26} speed={3} w={2} />

            {/* O₂ from source */}
            <Flow d={`M130,${OY} H210`} color={C.o2} active={o2Pressure > 26} speed={2} />
            <Flow d={`M230,${OY} H375`} color={C.o2} active={o2Pressure > 26} speed={2} />
            {/* O₂ to rotameter */}
            <Flow d={`M395,${OY} H455 V420 H${ORX} V${RB}`} color={C.o2} active={o2Flow > 0} speed={o2Flow} />
            {/* O₂ through rotameter (upward) */}
            <Flow d={`M${ORX},${RB} V${RT}`} color={C.o2} active={o2Flow > 0} speed={o2Flow} rev />

            {/* Combined FGF to vaporizer */}
            <Flow d={`M${NRX},${RT} V165 H660`} color={mixCol} active={flowOn && !o2FlushActive} speed={spd} />
            <Flow d={`M${ORX},${RT} V165 H660`} color={mixCol} active={flowOn && !o2FlushActive} speed={spd} />
            {/* Through vaporizer */}
            <Flow d={`M660,128 H760`} color={vaporizerOn ? C.agent : mixCol} active={flowOn && !o2FlushActive} speed={spd} />
            {/* To common outlet */}
            <Flow d={`M790,128 H940`} color={vaporizerOn ? C.agent : mixCol} active={flowOn && !o2FlushActive} speed={spd} />

            {/* O₂ flush */}
            <Flow d={`M220,${OY} V${OY + 110} H555 V680 H920 V128`}
              color={C.o2} active={o2FlushActive} speed={8} w={5} />

            {/* Inspiratory limb */}
            <Flow d={`M940,128 H1280 V580`}
              color={vaporizerOn ? C.agent : mixCol}
              active={isInsp && flowOn} speed={spd + 1} />

            {/* Expiratory limb */}
            <Flow d={`M1280,580 H940`}
              color={C.exp} active={isExp} speed={2} rev />

            {/* Through CO₂ canister (return path) */}
            <Flow d={`M940,580 V460`} color={C.co2} active={isExp} speed={1.5} />
            <Flow d={`M940,370 V128`} color={C.o2} active={isExp} speed={1.5} />

            {/* Ventilator to circuit during inspiration */}
            <Flow d={`M870,310 H940`} color={C.o2} active={isInsp && ventilatorOn} speed={3} />

            {/* ═══════════════════════════════════════════
                N₂O SOURCE COMPONENTS
            ════════════════════════════════════════════ */}
            <Cylinder x={22} y={55} w={44} h={78} col={C.n2o} label="N₂O" />
            <Cylinder x={74} y={55} w={44} h={78} col={C.n2o} label="N₂O" />
            <Txt x={30} y={48} t="CILINDROS" s={7.5} a="start" />
            <Txt x={30} y={38} t="N₂O" s={9} c={C.n2o} a="start" b />

            {/* N₂O pipeline */}
            <rect x={162} y={0} width={46} height={22} rx={3}
              fill={C.panel} stroke={C.n2o} strokeWidth={1.5} />
            <Txt x={185} y={14} t="LINEA N₂O" s={7} c={C.n2o} />

            {/* Check valve N₂O */}
            <CheckV cx={130} cy={NY} open={true} dir="R" />
            <Txt x={130} y={NY - 14} t="VALV. RETENC." s={7} />

            {/* N₂O pressure regulator */}
            <Gauge cx={210} cy={NY} psi={n2oPressure} max={55} name="REG. N₂O" />

            {/* Fail-safe valve */}
            <FailSafe cx={290} cy={NY} active={failSafeActive} />

            {/* Second-stage N₂O regulator */}
            <circle cx={385} cy={NY} r={14} fill={C.bg} stroke={failSafeActive ? C.dim : C.n2o} strokeWidth={1.5} />
            <circle cx={385} cy={NY} r={8} fill={C.panel} stroke={C.border} strokeWidth={1} />
            <circle cx={409} cy={NY - 22} r={8} fill={C.bg} stroke={C.label} strokeWidth={1} />
            <Txt x={409} y={NY - 18} t="C" s={8} c={C.label} />
            <Txt x={385} y={NY + 26} t="REG. N₂O 2da" s={7} />

            {/* Needle valve N₂O indicator */}
            <rect x={448} y={NY + 10} width={14} height={50} rx={2}
              fill={C.panel} stroke={C.dim} strokeWidth={1} />
            <Txt x={455} y={NY + 72} t="AGUJA" s={7} />

            {/* ═══════════════════════════════════════════
                O₂ SOURCE COMPONENTS
            ════════════════════════════════════════════ */}
            <Cylinder x={22} y={530} w={44} h={100} col={C.o2} label="O₂" />
            <Cylinder x={74} y={530} w={44} h={100} col={C.o2} label="O₂" />
            <Txt x={30} y={524} t="CILINDROS" s={7.5} a="start" />
            <Txt x={30} y={514} t="O₂" s={9} c={C.o2} a="start" b />

            {/* O₂ pipeline */}
            <rect x={162} y={738} width={46} height={22} rx={3}
              fill={C.panel} stroke={C.o2} strokeWidth={1.5} />
            <Txt x={185} y={752} t="LINEA O₂" s={7} c={C.o2} />

            {/* Line pressure gauge */}
            <Gauge cx={168} cy={700} r={14} psi={o2Pressure} max={55} name="PRES. LINEA" />

            {/* Check valve O₂ */}
            <CheckV cx={130} cy={OY} open={true} dir="R" />
            <Txt x={130} y={OY + 15} t="VALV. RETENC." s={7} />

            {/* Main on/off switch */}
            <rect x={140} y={OY - 14} width={32} height={28} rx={3}
              fill={C.panel} stroke={mode === 'o2_failure' ? C.danger : C.ok} strokeWidth={1.5} />
            <Txt x={156} y={OY - 4} t="ON" s={7} c={C.ok} b />
            <Txt x={156} y={OY + 7} t="OFF" s={7} c={C.label} />
            <Txt x={156} y={OY + 22} t="INTERRUPTOR" s={6.5} c={C.label} />

            {/* O₂ pressure regulator */}
            <Gauge cx={210} cy={OY} psi={o2Pressure} max={55} name="REG. O₂" />

            {/* O₂ supply low-pressure alarm */}
            <BoxLabel x={315} y={520} w={130} h={20} label="ALARMA PRES. BAJA O₂" />

            {/* Auxiliary O₂ flowmeter */}
            <BoxLabel x={315} y={545} w={130} h={20} label="FLUXOMETRO AUX. O₂" />

            {/* Auxiliary O₂ DISS connector */}
            <BoxLabel x={315} y={570} w={130} h={20} label="CONECTOR AUX. O₂ DISS" />

            {/* Second-stage O₂ regulator (B) */}
            <circle cx={385} cy={OY} r={14} fill={C.bg} stroke={C.o2} strokeWidth={1.5} />
            <circle cx={385} cy={OY} r={8} fill={C.panel} stroke={C.border} strokeWidth={1} />
            <circle cx={409} cy={OY - 22} r={8} fill={C.bg} stroke={C.label} strokeWidth={1} />
            <Txt x={409} y={OY - 18} t="B" s={8} c={C.label} />
            <Txt x={385} y={OY + 26} t="REG. O₂ 2da" s={7} />

            {/* Needle valve O₂ indicator */}
            <rect x={448} y={OY - 60} width={14} height={50} rx={2}
              fill={C.panel} stroke={C.dim} strokeWidth={1} />
            <Txt x={455} y={OY - 18} t="AGUJA" s={7} />

            {/* Ventilator driving gas box */}
            <rect x={38} y={356} width={168} height={28} rx={3}
              fill={C.panel} stroke={C.dim} strokeWidth={1} />
            <Txt x={122} y={365} t="CIRCUITO GAS IMPULSOR" s={7.5} />
            <Txt x={122} y={376} t="VENTILADOR ANESTESIA" s={7.5} />

            {/* ═══════════════════════════════════════════
                ROTAMETERS
            ════════════════════════════════════════════ */}
            <Rotameter cx={NRX} yt={RT} yb={RB} flow={failSafeActive ? 0 : n2oFlow} max={12} col={C.n2o} label="N₂O" />
            <Rotameter cx={ORX} yt={RT} yb={RB} flow={o2Flow} max={12} col={C.o2} label="O₂" />

            {/* Rotameter section label */}
            <Txt x={560} y={RT - 18} t="ROTAMETROS" s={9} c={C.label} b />

            {/* Manifold junction */}
            <circle cx={605} cy={165} r={5} fill={mixCol} opacity={flowOn ? 0.9 : 0.3} />
            <Txt x={605} y={152} t="MANIFOLD" s={7.5} />

            {/* ═══════════════════════════════════════════
                VAPORIZER
            ════════════════════════════════════════════ */}
            <Vaporizer x={660} y={55} on={vaporizerOn} conc={agentConcentration} />
            <Txt x={710} y={48} t="VAPORIZADORES CON INTERLOCK" s={8} c={C.label} />

            {/* ═══════════════════════════════════════════
                OUTLET SECTION
            ════════════════════════════════════════════ */}

            {/* Pressure relief valve D */}
            <PressureReliefValve cx={790} cy={85} active={pressureReliefActive} />
            {/* Animated gas flow toward muelle when relief valve opens */}
            {pressureReliefActive && (
              <path d={`M790,69 H845 V270`} fill="none" stroke={C.warn} strokeWidth={2.5}
                strokeDasharray="9 5"
                style={{ animation: 'flowMove 0.45s linear infinite' }} />
            )}
            {/* Vent path label */}
            <Txt x={852} y={185} t="DESCARGA" s={6.5} c={pressureReliefActive ? C.warn : C.dim} a="start" />
            <Txt x={852} y={195} t="→ MUELLE" s={6.5} c={pressureReliefActive ? C.warn : C.dim} a="start" />

            {/* Outlet check valve E */}
            <CheckV cx={835} cy={128} open={flowOn} dir="R" />
            <circle cx={850} cy={107} r={8} fill={C.bg} stroke={C.label} strokeWidth={1} />
            <Txt x={850} y={111} t="E" s={8} c={C.label} />
            <Txt x={855} y={128} t="VALV. SALIDA" s={7.5} a="start" />

            {/* Common gas outlet */}
            <rect x={872} y={112} width={105} height={32} rx={4}
              fill={C.panel} stroke={flowOn ? mixCol : C.dim} strokeWidth={2} />
            <Txt x={924} y={124} t="SALIDA GAS COMUN" s={7.5} c={C.white} b />
            <Txt x={924} y={135} t="DISPOSITIVO RETENCION" s={6.5} />
            {/* Arrow to patient */}
            <line x1={977} y1={128} x2={1005} y2={128} stroke={mixCol} strokeWidth={2} />
            <polygon points={`1005,123 1015,128 1005,133`}
              fill={mixCol} opacity={flowOn ? 0.9 : 0.3} />
            <Txt x={1010} y={116} t="AL CIRCUITO" s={7.5} a="start" />
            <Txt x={1010} y={106} t="RESPIRATORIO" s={7.5} a="start" />

            {/* O₂ flush valve */}
            <rect x={520} y={665} width={70} height={30} rx={4}
              fill={o2FlushActive ? C.o2 : C.panel}
              stroke={C.o2} strokeWidth={o2FlushActive ? 2.5 : 1.5} />
            <Txt x={555} y={679} t="FLUSH O₂" s={8} c={o2FlushActive ? C.bg : C.o2} b />
            <Txt x={555} y={690} t="35-75 L/min" s={7} c={o2FlushActive ? C.bg : C.label} />
            <Txt x={555} y={710} t="VALVULA FLUSH O₂" s={7} />

            {/* ═══════════════════════════════════════════
                PATIENT CIRCUIT
            ════════════════════════════════════════════ */}

            {/* Section border */}
            <rect x={932} y={110} width={430} height={490} rx={6}
              fill="none" stroke={C.border} strokeWidth={1} strokeDasharray="6 4" />
            <Txt x={1147} y={105} t="CIRCUITO RESPIRATORIO (SISTEMA CIRCULAR)" s={8.5} c={C.label} />

            {/* Inspiratory check valve */}
            <CheckV cx={975} cy={128} open={isInsp} dir="R" />
            <Txt x={975} y={115} t="INSP." s={7} />

            {/* Expiratory check valve */}
            <CheckV cx={1140} cy={580} open={isExp} dir="L" />
            <Txt x={1140} y={595} t="ESP." s={7} />

            {/* CO₂ Canister (left side of loop, between y=460 and y=580) */}
            <Canister x={910} y={455} sat={canisterSaturation} />

            {/* APL valve */}
            <circle cx={880} cy={460} r={13} fill={C.panel} stroke={C.label} strokeWidth={1.5} />
            <Txt x={880} y={457} t="APL" s={7} c={C.label} />
            <Txt x={880} y={467} t="VALV" s={7} c={C.label} />
            <Txt x={880} y={480} t="APL" s={7} />

            {/* Reservoir bag */}
            <ellipse cx={858} cy={460} rx={20} ry={30}
              fill={C.panel} stroke={C.label} strokeWidth={1.5} />
            <Txt x={858} y={457} t="BOLSA" s={6.5} c={C.label} />
            <Txt x={858} y={467} t="RESERV." s={6.5} c={C.label} />

            {/* Bellows / ventilator in patient circuit */}
            <Bellows x={812} y={270} phase={ventPhase} prog={breathProgress} />

            {/* Patient Y-piece */}
            <circle cx={1280} cy={354} r={13} fill={C.panel}
              stroke={isInsp ? mixCol : isExp ? C.exp : C.dim} strokeWidth={2} />
            <Txt x={1280} y={358} t="Y" s={9} c={C.white} b />
            <line x1={1293} y1={354} x2={1345} y2={354}
              stroke={isInsp ? mixCol : isExp ? C.exp : C.dim} strokeWidth={2} />
            {/* Patient symbol */}
            <rect x={1345} y={340} width={26} height={28} rx={3}
              fill={C.panel} stroke={C.label} strokeWidth={1} />
            <Txt x={1358} y={358} t="Px" s={9} c={C.label} b />
            <Txt x={1358} y={373} t="PACIENTE" s={7} />

            {/* Circuit leak indicator */}
            {circLeak && (
              <g>
                <circle cx={1060} cy={354} r={18} fill="none" stroke={C.danger} strokeWidth={2}>
                  <animate attributeName="r" values="12;22;12" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                </circle>
                <Txt x={1090} y={340} t="FUGA" s={8.5} c={C.danger} b />
              </g>
            )}

            {/* ═══════════════════════════════════════════
                FGF INFO BOX (improved, no overlap)
            ════════════════════════════════════════════ */}
            <rect x={987} y={145} width={230} height={100} rx={5}
              fill={C.panel} stroke={C.border} strokeWidth={1.5} />
            <Txt x={1102} y={160} t="FLUJO GAS FRESCO" s={9} c={C.white} b />
            <Txt x={1102} y={174}
              t={`${o2FlushActive ? '50.0' : totalFGF.toFixed(1)} L/min`}
              s={12} c={mixCol} b />
            {/* Four values in a row */}
            <Txt x={1000} y={192} t={`O₂: ${(fio2 * 100).toFixed(0)}%`} s={9} c={C.o2} a="start" b />
            <Txt x={1073} y={192} t={`N₂O: ${(fn2o * 100).toFixed(0)}%`} s={9} c={C.n2o} a="start" b />
            <Txt x={1152} y={192} t={`AGT: ${(agentFraction * 100).toFixed(1)}%`} s={9} c={C.agent} a="start" b />
            <Txt x={1102} y={208} t={`FiO₂: ${(fio2 * 100).toFixed(0)}%`}
              s={10} c={hypoxic ? C.danger : C.ok} b />
            {hypoxic && (
              <Txt x={1102} y={222} t="MEZCLA HIPOXICA" s={8.5} c={C.danger} b />
            )}

            {/* ═══════════════════════════════════════════
                SECTION DIVIDERS & LABELS
            ════════════════════════════════════════════ */}
            <line x1={170} y1={10} x2={170} y2={740} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <line x1={430} y1={10} x2={430} y2={740} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <line x1={600} y1={10} x2={600} y2={740} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <line x1={770} y1={10} x2={770} y2={740} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <line x1={930} y1={10} x2={930} y2={740} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />

            <Txt x={85} y={18} t="FUENTES" s={8} />
            <Txt x={300} y={18} t="REGULADORES / FAIL-SAFE" s={8} />
            <Txt x={515} y={18} t="ROTAMETROS" s={8} />
            <Txt x={685} y={18} t="VAPORIZADOR" s={8} />
            <Txt x={850} y={18} t="SALIDA" s={8} />

            {/* Mode indicator */}
            {mode !== 'normal' && (
              <rect x={400} y={730} width={580} height={24} rx={4}
                fill="#1a0a0a" stroke={C.danger} strokeWidth={1.5} />
            )}
            {mode !== 'normal' && (
              <Txt x={690} y={746}
                t={
                  mode === 'o2_failure' ? 'MODO: FALLA DE O₂ — FAIL-SAFE ACTIVO' :
                  mode === 'circuit_leak' ? 'MODO: FUGA EN CIRCUITO RESPIRATORIO' :
                  'MODO: FUGA EN VAPORIZADOR'
                }
                s={9} c={C.danger} b />
            )}

          </g>
        </svg>
      </div>
    </div>
  )
}
