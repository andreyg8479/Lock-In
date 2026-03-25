import { describe, expect, it } from 'vitest'
import { matchesKeyCombo, type KeyComboSpec } from './keyComboDetector'

function makeKeydown(
  init: Partial<Pick<KeyboardEvent, 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'repeat'>> & {
    key: string
  }
): KeyboardEvent {
  return {
    key: init.key,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    repeat: init.repeat ?? false,
  } as KeyboardEvent
}

describe('matchesKeyCombo', () => {
  const shiftAltH: KeyComboSpec = {
    key: 'h',
    shift: true,
    alt: true,
    ctrl: false,
  }

  it('matches Shift+Alt+H', () => {
    const e = makeKeydown({
      key: 'H',
      shiftKey: true,
      altKey: true,
    })
    expect(matchesKeyCombo(e, shiftAltH)).toBe(true)
  })

  it('matches lowercase h with Shift+Alt', () => {
    const e = makeKeydown({
      key: 'h',
      shiftKey: true,
      altKey: true,
    })
    expect(matchesKeyCombo(e, shiftAltH)).toBe(true)
  })

  it('does not match when Shift is missing', () => {
    const e = makeKeydown({
      key: 'h',
      altKey: true,
    })
    expect(matchesKeyCombo(e, shiftAltH)).toBe(false)
  })

  it('does not match when Alt is missing', () => {
    const e = makeKeydown({
      key: 'h',
      shiftKey: true,
    })
    expect(matchesKeyCombo(e, shiftAltH)).toBe(false)
  })

  it('does not match wrong key', () => {
    const e = makeKeydown({
      key: 'j',
      shiftKey: true,
      altKey: true,
    })
    expect(matchesKeyCombo(e, shiftAltH)).toBe(false)
  })

  it('matches named keys like Escape', () => {
    const spec: KeyComboSpec = {
      key: 'Escape',
      shift: false,
      alt: false,
      ctrl: false,
    }
    const e = makeKeydown({ key: 'Escape' })
    expect(matchesKeyCombo(e, spec)).toBe(true)
  })

})
