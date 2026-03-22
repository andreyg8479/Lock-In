import { useEffect, useRef } from 'react'
import {
  matchesKeyCombo,
  type KeyComboDetectorOptions,
  type KeyComboSpec,
} from './keyComboDetector'

export type UseKeyComboDetectorOptions = KeyComboDetectorOptions & {
  /** When false, no listener is registered. Default true. */
  enabled?: boolean
  /** Use capture phase. Default true so shortcuts run before many handlers. */
  capture?: boolean
  /** Call preventDefault when the combo matches. Default false. */
  preventDefault?: boolean
}

/**
 * Registers a window keydown listener; when the event matches `spec`, calls `onMatch`.
 */
export function useKeyComboDetector(
  spec: KeyComboSpec,
  onMatch: (event: KeyboardEvent) => void,
  options: UseKeyComboDetectorOptions = {}
): void {
  const {
    enabled = true,
    capture = true,
    preventDefault = false,
    ignoreRepeat,
  } = options

  const onMatchRef = useRef(onMatch)
  onMatchRef.current = onMatch

  const matchOpts: KeyComboDetectorOptions =
    ignoreRepeat !== undefined ? { ignoreRepeat } : {}

  useEffect(() => {
    if (!enabled) return

    const handler = (event: KeyboardEvent) => {
      if (!matchesKeyCombo(event, spec, matchOpts)) return
      if (preventDefault) event.preventDefault()
      onMatchRef.current(event)
    }

    window.addEventListener('keydown', handler, capture)
    return () => window.removeEventListener('keydown', handler, capture)
  }, [
    enabled,
    capture,
    preventDefault,
    spec.key,
    spec.shift,
    spec.alt,
    spec.ctrl,
    spec.meta,
    matchOpts.ignoreRepeat,
  ])
}
