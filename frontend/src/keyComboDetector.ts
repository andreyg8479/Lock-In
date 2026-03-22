/**
 * A user-chosen shortcut key combo
 */
export type KeyComboSpec = {
  key: string
  shift: boolean
  alt: boolean
  ctrl: boolean
  meta?: boolean
}

export type KeyComboDetectorOptions = {
  // ignores repeat: should be true by default
  ignoreRepeat?: boolean
}

// keymatch helper
function keysMatch(eventKey: string, specKey: string): boolean {
  if (specKey.length === 1 && eventKey.length === 1) {
    return eventKey.toLowerCase() === specKey.toLowerCase()
  }
  return eventKey === specKey
}


 // Checks whether a keydown event satisfies the given combination.
 
export function matchesKeyCombo(
  event: KeyboardEvent,
  spec: KeyComboSpec,
  options: KeyComboDetectorOptions = {}
): boolean {
  const { ignoreRepeat = true } = options
  if (ignoreRepeat && event.repeat) return false

  const meta = spec.meta ?? false
  if (event.shiftKey !== spec.shift) return false
  if (event.altKey !== spec.alt) return false
  if (event.ctrlKey !== spec.ctrl) return false
  if (event.metaKey !== meta) return false

  return keysMatch(event.key, spec.key)
}
