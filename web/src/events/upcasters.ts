type Upcaster = (payload: unknown) => unknown

// Registry: eventType → { fromVersion → upcaster to (fromVersion + 1) }
const registry: Partial<Record<string, Record<number, Upcaster>>> = {}

export function registerUpcaster(
  eventType: string,
  fromVersion: number,
  upcaster: Upcaster
): void {
  registry[eventType] ??= {}
  registry[eventType]![fromVersion] = upcaster
}

// Applies the chain: v1 → v2 → v3 → ... → current
export function upcast(rawEvent: unknown): unknown {
  if (typeof rawEvent !== 'object' || rawEvent === null) return rawEvent
  const ev = rawEvent as Record<string, unknown>
  const type = ev.type as string
  const chain = registry[type]
  if (!chain) return rawEvent

  let version = (ev.payload as any)?.schemaVersion ?? 1
  let payload = ev.payload
  while (chain[version]) {
    payload = chain[version](payload)
    version += 1
  }
  return { ...ev, payload }
}
