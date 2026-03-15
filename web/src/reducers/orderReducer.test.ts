import { describe, it, expect } from 'vitest'
import { orderReducer, initialOrderViewModel } from './orderReducer'
import type { OrderEvent } from '../types/events'

const orderId = '00000000-0000-0000-0000-000000000001'
const itemId = 'item-001'
const now = new Date().toISOString()

function placedEvent(seq = 1): OrderEvent {
  return {
    type: 'OrderPlaced',
    payload: {
      sequenceNumber: seq,
      occurredAt: now,
      orderId,
      customerId: 'cust-123',
      items: [{ itemId, pizzaId: 'pizza-margherita', name: 'Margherita', quantity: 1, unitPrice: 12.99 }],
      fulfillmentType: 'delivery',
      deliveryAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
      totalPrice: 12.99,
      placedAt: now,
    },
  }
}

describe('orderReducer', () => {
  it('initializes from OrderPlaced', () => {
    const state = orderReducer(initialOrderViewModel(orderId), placedEvent())
    expect(state.status).toBe('pending')
    expect(state.items).toHaveLength(1)
    expect(state.items[0].name).toBe('Margherita')
    expect(state.lastSequenceNumber).toBe(1)
  })

  it('transitions through happy path statuses', () => {
    let state = orderReducer(initialOrderViewModel(orderId), placedEvent(1))

    state = orderReducer(state, {
      type: 'OrderConfirmed',
      payload: { sequenceNumber: 2, occurredAt: now, orderId, acceptedBy: 'staff-1', estimatedPrepMinutes: 20, confirmedAt: now },
    })
    expect(state.status).toBe('confirmed')
    expect(state.estimatedReadyAt).not.toBeNull()

    state = orderReducer(state, {
      type: 'PrepStarted',
      payload: { sequenceNumber: 3, occurredAt: now, orderId, itemId, kitchenStation: 'station-1', prepStartedAt: now },
    })
    expect(state.status).toBe('preparing')
    expect(state.items[0].kitchenStation).toBe('station-1')

    state = orderReducer(state, {
      type: 'PizzaBaking',
      payload: { sequenceNumber: 4, occurredAt: now, orderId, itemId, ovenNumber: 2, bakingStartedAt: now },
    })
    expect(state.status).toBe('baking')

    state = orderReducer(state, {
      type: 'OrderReady',
      payload: { sequenceNumber: 5, occurredAt: now, orderId, readyAt: now },
    })
    expect(state.status).toBe('ready')

    state = orderReducer(state, {
      type: 'OrderDispatched',
      payload: { sequenceNumber: 6, occurredAt: now, orderId, driverId: 'driver-1', dispatchedAt: now },
    })
    expect(state.status).toBe('dispatched')

    state = orderReducer(state, {
      type: 'OrderDelivered',
      payload: { sequenceNumber: 7, occurredAt: now, orderId, driverId: 'driver-1', deliveredAt: now, deliveryDurationMinutes: 22 },
    })
    expect(state.status).toBe('delivered')
    expect(state.lastSequenceNumber).toBe(7)
  })

  it('is idempotent — ignores duplicate sequence numbers', () => {
    let state = orderReducer(initialOrderViewModel(orderId), placedEvent(1))
    state = orderReducer(state, {
      type: 'OrderConfirmed',
      payload: { sequenceNumber: 2, occurredAt: now, orderId, acceptedBy: 'staff-1', estimatedPrepMinutes: 20, confirmedAt: now },
    })
    // Apply OrderConfirmed again with same seq number
    const stateAfterDuplicate = orderReducer(state, {
      type: 'OrderConfirmed',
      payload: { sequenceNumber: 2, occurredAt: now, orderId, acceptedBy: 'staff-2', estimatedPrepMinutes: 99, confirmedAt: now },
    })
    expect(stateAfterDuplicate).toBe(state) // referential equality — no new object
  })

  it('ignores out-of-order events with lower sequence number', () => {
    let state = orderReducer(initialOrderViewModel(orderId), placedEvent(1))
    state = orderReducer(state, {
      type: 'OrderConfirmed',
      payload: { sequenceNumber: 2, occurredAt: now, orderId, acceptedBy: 'staff-1', estimatedPrepMinutes: 20, confirmedAt: now },
    })
    // Apply stale event with seq=1
    const stateAfterStale = orderReducer(state, placedEvent(1))
    expect(stateAfterStale).toBe(state)
  })

  it('handles OrderCancelled after PrepStarted (append-only)', () => {
    let state = orderReducer(initialOrderViewModel(orderId), placedEvent(1))
    state = orderReducer(state, {
      type: 'PrepStarted',
      payload: { sequenceNumber: 2, occurredAt: now, orderId, itemId, kitchenStation: 'station-1', prepStartedAt: now },
    })
    state = orderReducer(state, {
      type: 'OrderCancelled',
      payload: { sequenceNumber: 3, occurredAt: now, orderId, reason: 'Customer request', cancelledAt: now, refundEligible: true },
    })
    expect(state.status).toBe('cancelled')
    // Prep started item is still in items list (append-only)
    expect(state.items).toHaveLength(1)
    expect(state.items[0].kitchenStation).toBe('station-1')
  })
})
