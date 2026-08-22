export function safeJSONStringify(value: any, space?: number): string {
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    (key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]'
        }

        // Extremely robust detection of DOM elements, React elements, Fiber nodes, or Windows
        const cName = val.constructor?.name
        let hasReactKey = false
        try {
          hasReactKey = Object.keys(val).some(k => k.startsWith('__react'))
        } catch {}

        const isReactOrDOM =
          (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) ||
          (typeof Element !== 'undefined' && val instanceof Element) ||
          (typeof Window !== 'undefined' && val instanceof Window) ||
          (typeof val.nodeType === 'number') ||
          (val.$$typeof !== undefined) ||
          (cName === 'FiberNode' || cName === 'FiberRootNode' || (typeof cName === 'string' && cName.includes('Event'))) ||
          ('nativeEvent' in val || 'stateNode' in val) ||
          hasReactKey

        if (isReactOrDOM) {
          return '[DOM/React Element/Fiber]'
        }
        seen.add(val)
      }
      return val
    },
    space
  )
}
