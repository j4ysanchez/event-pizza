import { describe, it, expect } from 'vitest'
import { registerUpcaster, upcast } from './upcasters'
import { OrderEventSchema } from '../types/events'

// ─── Registry isolation ───────────────────────────────────────────────────────
//
// upcasters.ts holds a module-level registry object. Vitest re-uses the same
// module instance across tests in a file, so we must be careful not to let
// upcasters registered in one test bleed into another.
//
// Strategy: use a unique fictional event type per test that needs isolation,
// so registrations never collide across tests.

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('upcast', () => {
  it('a: returns raw event unchanged when no upcasters are registered for its type', () => {
    const raw = {
      type: 'NoUpcasterEvent',
      payload: { schemaVersion: 1, sequenceNumber: 1 },
    }
    const result = upcast(raw)
    expect(result).toBe(raw) // referential equality — nothing was copied
  })

  it('b: applies a single v1→v2 upcaster and updates schemaVersion', () => {
    registerUpcaster('SingleStepEvent', 1, (payload: any) => ({
      ...payload,
      schemaVersion: 2,
      addedField: 'from-v2',
    }))

    const raw = {
      type: 'SingleStepEvent',
      payload: { schemaVersion: 1, value: 'original' },
    }
    const result = upcast(raw) as { type: string; payload: any }

    expect(result.payload.schemaVersion).toBe(2)
    expect(result.payload.addedField).toBe('from-v2')
    expect(result.payload.value).toBe('original')
  })

  it('c: chains v1→v2 and v2→v3 upcasters, arriving at v3', () => {
    registerUpcaster('ChainedEvent', 1, (payload: any) => ({
      ...payload,
      schemaVersion: 2,
      stepOne: true,
    }))
    registerUpcaster('ChainedEvent', 2, (payload: any) => ({
      ...payload,
      schemaVersion: 3,
      stepTwo: true,
    }))

    const raw = {
      type: 'ChainedEvent',
      payload: { schemaVersion: 1, original: 'yes' },
    }
    const result = upcast(raw) as { type: string; payload: any }

    expect(result.payload.schemaVersion).toBe(3)
    expect(result.payload.stepOne).toBe(true)
    expect(result.payload.stepTwo).toBe(true)
    expect(result.payload.original).toBe('yes')
  })

  it('d: passes through unchanged when schemaVersion is already at the latest registered version', () => {
    // Only v1→v2 is registered; a v2 event should pass through untouched.
    registerUpcaster('AlreadyCurrentEvent', 1, (payload: any) => ({
      ...payload,
      schemaVersion: 2,
      shouldNotAppear: true,
    }))

    const raw = {
      type: 'AlreadyCurrentEvent',
      payload: { schemaVersion: 2, existing: 'data' },
    }
    const result = upcast(raw) as { type: string; payload: any }

    // The upcaster for v1 should NOT have fired
    expect(result.payload.schemaVersion).toBe(2)
    expect(result.payload.shouldNotAppear).toBeUndefined()
    expect(result.payload.existing).toBe('data')
  })

  it('e: treats a missing schemaVersion as v1 and applies the v1→v2 upcaster', () => {
    registerUpcaster('MissingVersionEvent', 1, (payload: any) => ({
      ...payload,
      schemaVersion: 2,
      upgraded: true,
    }))

    const raw = {
      type: 'MissingVersionEvent',
      // No schemaVersion field at all — should default to 1
      payload: { someField: 'hello' },
    }
    const result = upcast(raw) as { type: string; payload: any }

    expect(result.payload.schemaVersion).toBe(2)
    expect(result.payload.upgraded).toBe(true)
    expect(result.payload.someField).toBe('hello')
  })

  it('f: passes through gracefully for non-object inputs', () => {
    expect(upcast(null)).toBeNull()
    expect(upcast(undefined)).toBeUndefined()
    expect(upcast('a string')).toBe('a string')
    expect(upcast(42)).toBe(42)
  })
})

// ─── Integration test ─────────────────────────────────────────────────────────
//
// NOTE: Zod v4 uses a strict RFC-4122 UUID regex that requires:
//   - version nibble (3rd group, 1st char): [1-8]
//   - variant nibble (4th group, 1st char): [89abAB]
// Fake all-zero UUIDs like "00000000-0000-0000-0000-000000000001" fail this
// check. The integration tests below use RFC-4122-compliant UUIDs.

describe('upcast + OrderEventSchema integration', () => {
  it('g: a v1 OrderPlaced event with no upcaster registered parses successfully', () => {
    const now = new Date().toISOString()

    // Raw event as it would arrive from the SSE stream.
    // schemaVersion: 1 is included explicitly to exercise the default path.
    const raw = {
      type: 'OrderPlaced',
      payload: {
        schemaVersion: 1,
        sequenceNumber: 1,
        occurredAt: now,
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: 'cust-integration',
        items: [
          {
            itemId: 'item-001',
            pizzaId: 'pizza-margherita',
            name: 'Margherita',
            quantity: 1,
            unitPrice: 12.99,
          },
        ],
        fulfillmentType: 'delivery',
        deliveryAddress: {
          street: '1 Integration Blvd',
          city: 'Testville',
          state: 'TX',
          zip: '00001',
        },
        totalPrice: 12.99,
        placedAt: now,
      },
    }

    // No upcaster registered for OrderPlaced — upcast should return the raw
    // event reference unchanged, then safeParse should succeed.
    const upcasted = upcast(raw)
    const result = OrderEventSchema.safeParse(upcasted)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('OrderPlaced')
      expect(result.data.payload.orderId).toBe('550e8400-e29b-41d4-a716-446655440001')
      // schemaVersion defaulted/preserved correctly
      expect(result.data.payload.schemaVersion).toBe(1)
    }
  })

  it('g2: a v1 OrderPlaced event with an extra unknown field is preserved via .passthrough()', () => {
    const now = new Date().toISOString()

    const raw = {
      type: 'OrderPlaced',
      payload: {
        schemaVersion: 1,
        sequenceNumber: 2,
        occurredAt: now,
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        customerId: 'cust-passthrough',
        items: [],
        fulfillmentType: 'pickup',
        deliveryAddress: null,
        totalPrice: 0,
        placedAt: now,
        futureField: 'this-should-survive-passthrough',
      },
    }

    const result = OrderEventSchema.safeParse(upcast(raw))

    expect(result.success).toBe(true)
    if (result.success) {
      // .passthrough() on the payload schema means extra fields survive
      expect((result.data.payload as any).futureField).toBe('this-should-survive-passthrough')
    }
  })
})
