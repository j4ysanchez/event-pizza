# Schema Evolution Plan

## The core problem in one sentence

`useSSEConnection` at `web/src/hooks/useSSEConnection.ts:66` goes `raw JSON → OrderEventSchema.safeParse()` with nothing in between. There's no place to normalize old shapes, and unknown `type` values are indistinguishable from malformed known events.

---

## Phase 1 — Non-breaking foundations (do this now, before any schema changes)

### 1a. Add `schemaVersion` to `BaseEventFields`

```ts
// events.ts
const BaseEventFields = {
  sequenceNumber: z.number().int().nonnegative(),
  occurredAt:     z.string().datetime(),
  schemaVersion:  z.number().int().positive().default(1),  // ← add this
}
```

`z.default(1)` means every existing event in the wild — which has no `schemaVersion` — parses as version 1 without any server changes. This is the anchor version all upcasters will migrate *from*.

### 1b. Add `.passthrough()` to all payload schemas

```ts
const OrderPlacedPayloadSchema = z.object({ ... }).passthrough()
```

Without this, any new field the server adds is silently stripped by Zod. That's fine today, but when you later write an upcaster that depends on a new field coexisting with old ones, stripping breaks it. `.passthrough()` preserves unknown fields through the parse.

### 1c. Separate unknown-type events from malformed-known events in `useSSEConnection`

Replace the current single `safeParse` failure path with two distinct paths:

```ts
// Before calling schema.safeParse, peek at the type field
const rawType = (parsed as any)?.type
const knownTypes = new Set([ 'OrderPlaced', 'OrderConfirmed', /* ... */ ])

if (rawType && !knownTypes.has(rawType)) {
  console.warn('[SSE] Unknown event type, skipping:', rawType)
  return  // forward-compatible: future event types don't crash old clients
}

const result = schema.safeParse(upcasted)  // (upcaster added in Phase 2)
if (!result.success) {
  console.error('[SSE] Schema validation failed for known event:', rawType, result.error.flatten())
  return
}
```

This is the difference between "gracefully ignoring a new `DriverTipped` event" vs "crashing because `OrderPlaced` now has a different `items` shape."

---

## Phase 2 — Upcaster infrastructure

### 2a. Create `src/events/upcasters.ts`

The upcaster layer sits between `JSON.parse` and `OrderEventSchema.safeParse`. It operates on raw `unknown` objects — before Zod — because Zod would reject the old shapes.

```
Canonical shape of an upcaster:
(rawPayload: unknown) => unknown
```

Structure:

```ts
// src/events/upcasters.ts

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
    payload  = chain[version](payload)
    version += 1
  }
  return { ...ev, payload }
}
```

### 2b. Insert `upcast()` into `useSSEConnection`

One-line change at `web/src/hooks/useSSEConnection.ts:66`:

```ts
const result = schema.safeParse(upcast(parsed))   // was: schema.safeParse(parsed)
```

The `upcast` function is a pure transform with no side effects — it's easily unit-tested and doesn't touch the Zod schema or reducer.

---

## Phase 3 — Upcaster authoring workflow (how you use it)

When you need to ship `OrderPlaced_v2` (e.g. `toppings` changes from `string[]` to `{ name, quantity }[]`):

1. **Write the upcaster first**, before deploying the server change:
   ```ts
   // src/events/upcasters.ts
   registerUpcaster('OrderPlaced', 1, (payload) => {
     const p = payload as any
     return {
       ...p,
       schemaVersion: 2,
       items: p.items.map((item: any) => ({
         ...item,
         toppings: (item.toppings ?? []).map((t: string) => ({ name: t, quantity: 1 }))
       }))
     }
   })
   ```

2. **Update `OrderItemSchema` in `events.ts`** to the new `toppings` shape.

3. **Update the reducer** if the new fields need to be projected into the view model.

4. **Ship the client.** Old events (v1) are upcasted on read. New events (v2) pass through untouched (no matching upcaster for v2→v3 exists yet).

5. **Ship the server.** Both old and new events are now handled correctly.

---

## Phase 4 — Test strategy

Each upcaster needs two test artifacts:

**Fixture file** — the raw JSON exactly as it came off the wire, frozen at the time of the schema change:
```
src/events/__fixtures__/OrderPlaced_v1.json
```

**Upcaster test** — assert the fixture produces a valid current-schema event:
```ts
it('upcasts OrderPlaced v1 → v2', () => {
  const raw = OrderPlaced_v1_fixture
  const upcasted = upcast(raw)
  const result = OrderEventSchema.safeParse(upcasted)
  expect(result.success).toBe(true)
})
```

**Reducer integration test** — run the full chain (fixture → upcast → parse → reduce) and assert the final `OrderViewModel` is correct. This catches the class of bug where the upcaster succeeds but the reducer reads the wrong field.

---

## What this gives you

| Risk | Before | After |
|---|---|---|
| New field added to known event | Zod strips it silently | `.passthrough()` preserves it |
| Unknown new event type from server | `safeParse` fails, logs error | Warns and skips |
| Breaking field change on known event | Hard parse failure, no events applied | Upcaster normalizes before parse |
| No version anchor | Can't determine what to migrate from | `schemaVersion` in envelope |
| Testing historical events | No fixtures, no regression path | Versioned fixtures + upcaster tests |

The total surface area of the change is small: one new file (`upcasters.ts`), one line changed in `useSSEConnection`, a `.passthrough()` on each payload schema, and `schemaVersion` in `BaseEventFields`. Everything else is written incrementally as schema changes actually happen.
