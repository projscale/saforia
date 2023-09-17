// Tiny app-level event bus based on a dedicated EventTarget

type AppEventMap = {
  'entries:changed': void
  'settings:open': 'prefs' | 'backup' | 'about'
}

const bus = new EventTarget()

export function on<K extends keyof AppEventMap>(type: K, handler: (e: CustomEvent<AppEventMap[K]>) => void) {
  const wrapped = handler as EventListener
  bus.addEventListener(type, wrapped)
  return () => bus.removeEventListener(type, wrapped)
}

export function emit<K extends keyof AppEventMap>(type: K, detail?: AppEventMap[K]) {
  bus.dispatchEvent(new CustomEvent(type, { detail }))
}
