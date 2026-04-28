export interface LibraryCapabilityStatus {
  isSupported: boolean
  reason: string | null
}

export function detectLibraryCapability(): LibraryCapabilityStatus {
  // Require File System Access API (showDirectoryPicker)
  if (typeof window === 'undefined') {
    return { isSupported: false, reason: 'No browser environment detected.' }
  }

  if (typeof (window as unknown as Record<string, unknown>)['showDirectoryPicker'] !== 'function') {
    return {
      isSupported: false,
      reason:
        'Library Mode requires a Chromium-based desktop browser (Chrome, Edge, or Opera) with File System Access support.',
    }
  }

  // Require a desktop-class environment (pointer device)
  const isTouchOnly =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

  if (isTouchOnly) {
    return {
      isSupported: false,
      reason:
        'Library Mode is optimised for desktop. Use Quick Read to open a comic on this device.',
    }
  }

  return { isSupported: true, reason: null }
}
