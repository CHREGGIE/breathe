import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Breath } from '../types'

const PANE = 'breathe'
const TICK_MS = 150
const RADIUS = 6

type Phase = { label: string; cue: string; secs: number; from: number; to: number }
type Pattern = { name: string; phases: Phase[] }

const inhale = (secs: number): Phase => ({ label: 'Breathe in', cue: 'through your nose', secs, from: 0, to: 1 })
const holdFull = (secs: number): Phase => ({ label: 'Hold', cue: 'soft shoulders', secs, from: 1, to: 1 })
const exhale = (secs: number): Phase => ({ label: 'Breathe out', cue: 'slowly, let it go', secs, from: 1, to: 0 })
const holdEmpty = (secs: number): Phase => ({ label: 'Rest', cue: 'stay still', secs, from: 0, to: 0 })

const PATTERNS: Pattern[] = [
  { name: 'Calm 4·6', phases: [inhale(4), exhale(6)] },
  { name: 'Box 4·4·4·4', phases: [inhale(4), holdFull(4), exhale(4), holdEmpty(4)] },
  { name: 'Relax 4·7·8', phases: [inhale(4), holdFull(7), exhale(8)] },
]

const patternAt = (i: number): Pattern => PATTERNS[i] ?? PATTERNS[0]!

const breath = atom(
  { plugin: 'breathe', key: 'breath' } as const,
  { elapsed: 0, pattern: 0, isPaused: false, cycles: 0 },
  { shape: 'breath-1' },
)

const cycleMs = (pattern: Pattern) => pattern.phases.reduce((sum, p) => sum + p.secs * 1000, 0)

// Where in the cycle we are: the phase, its seconds left, and the circle's size 0..1.
const locate = (pattern: Pattern, elapsed: number) => {
  let t = elapsed
  for (const phase of pattern.phases) {
    const ms = phase.secs * 1000
    if (t < ms) {
      const progress = t / ms
      const eased = (1 - Math.cos(Math.PI * progress)) / 2
      return {
        phase,
        secsLeft: Math.ceil((ms - t) / 1000),
        size: phase.from + (phase.to - phase.from) * eased,
      }
    }
    t -= ms
  }
  const last = pattern.phases[pattern.phases.length - 1]!
  return { phase: last, secsLeft: 0, size: last.to }
}

// A soft disc: solid core, a dotted halo at its edge, empty sky beyond.
const disc = (size: number): string[] => {
  const r = 1 + size * (RADIUS - 1)
  const rows: string[] = []
  for (let y = -RADIUS; y <= RADIUS; y++) {
    let line = ''
    for (let x = -RADIUS * 2; x <= RADIUS * 2; x++) {
      const d = Math.sqrt((x / 2) ** 2 + y ** 2)
      line += d <= r - 0.6 ? '●' : d <= r + 0.4 ? '·' : ' '
    }
    rows.push(line)
  }
  return rows
}

let timer: Timer | undefined

function start($: EngineInterface) {
  timer?.cancel()
  timer = $.clock.every(TICK_MS, () => {
    void update($, breath, b => {
      if (b.isPaused) return b
      const total = cycleMs(patternAt(b.pattern))
      const next = b.elapsed + TICK_MS
      return next >= total
        ? { ...b, elapsed: next - total, cycles: b.cycles + 1 }
        : { ...b, elapsed: next }
    })
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'breathe',
      description: 'Open or close a relaxing breathing guide',
    })
    // A reload keeps an open pane; keep it breathing.
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) start($)

    return next(e)
  })

  on('command.run', { command: 'breathe' }, async $ => {
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Breathing guide closed. Carry the calm with you.' }
    }
    await update($, breath, b => ({ ...b, elapsed: 0, cycles: 0, isPaused: false }))
    await $.ui.open({ id: PANE, title: 'Breathe' })
    start($)

    return { text: 'Breathing guide opened. Follow the circle.' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      timer?.cancel()
      timer = undefined
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, breath)
    const pattern = patternAt(b.pattern)
    const { phase, secsLeft, size } = locate(pattern, b.elapsed)
    const color = phase.to > phase.from ? 'cyan' : phase.to < phase.from ? 'magenta' : 'blue'

    return (
      <Box flexDirection="column" alignItems="center" paddingX={1}>
        <Text dimColor>{pattern.name}</Text>
        <Text> </Text>
        {disc(size).map(row => (
          <Text color={color}>{row}</Text>
        ))}
        <Text> </Text>
        <Text bold color={color}>
          {b.isPaused ? 'Paused' : `${phase.label}  ${secsLeft}`}
        </Text>
        <Text dimColor>{b.isPaused ? 'press p to resume' : phase.cue}</Text>
        <Text> </Text>
        <Text dimColor>
          {b.cycles} {b.cycles === 1 ? 'breath' : 'breaths'}
        </Text>
        <Box flexDirection="row" gap={1}>
          <Button
            key="pause"
            hotkey="p"
            label={b.isPaused ? 'Resume' : 'Pause'}
            onPress={() => update($, breath, s => ({ ...s, isPaused: !s.isPaused }))}
          />
          <Button
            key="pattern"
            hotkey="n"
            label="Next pattern"
            onPress={() =>
              update($, breath, s => ({
                ...s,
                pattern: (s.pattern + 1) % PATTERNS.length,
                elapsed: 0,
                cycles: 0,
              }))
            }
          />
          <Button key="close" hotkey="x" dimColor label="Close" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
