export type Breath = {
  // Milliseconds into the current pattern's cycle.
  elapsed: number
  pattern: number
  isPaused: boolean
  // Full cycles finished since the pane opened.
  cycles: number
}

declare module 'claude-code' {
  interface PluginState {
    breathe: { breath: Shaped<Breath> }
  }
}
