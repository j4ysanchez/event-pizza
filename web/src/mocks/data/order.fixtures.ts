import type { OrderEvent } from '../../types/events'
import type { OrderSnapshotResponse } from '../../types/api'

export const MOCK_ORDER_ID = '00000000-0000-0000-0000-000000000042'
export const MOCK_ITEM_ID = 'item-00000000-0001'

const now = () => new Date().toISOString()
const future = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString()

export function buildOrderSnapshot(overrides: Partial<OrderSnapshotResponse> = {}): OrderSnapshotResponse {
  return {
    orderId: MOCK_ORDER_ID,
    status: 'pending',
    customerId: 'cust-mock-123',
    items: [
      {
        itemId: MOCK_ITEM_ID,
        pizzaId: 'pizza-margherita',
        name: 'Margherita',
        quantity: 1,
        unitPrice: 12.99,
        status: null,
        kitchenStation: null,
        prepStartedAt: null,
        readyAt: null,
      },
    ],
    fulfillmentType: 'delivery',
    deliveryAddress: {
      street: '123 Main St',
      city: 'Spokane',
      state: 'WA',
      zip: '99201',
    },
    totalPrice: 12.99,
    estimatedReadyAt: null,
    placedAt: now(),
    lastSequenceNumber: 1,
    ...overrides,
  }
}

// Happy path SSE event sequence — emitted with delays by MSW
export function buildHappyPathEvents(): OrderEvent[] {
  const placedAt = now()
  return [
    {
      type: 'OrderPlaced',
      payload: {
        sequenceNumber: 1,
        occurredAt: placedAt,
        orderId: MOCK_ORDER_ID,
        customerId: 'cust-mock-123',
        items: [{ itemId: MOCK_ITEM_ID, pizzaId: 'pizza-margherita', name: 'Margherita', quantity: 1, unitPrice: 12.99 }],
        fulfillmentType: 'delivery',
        deliveryAddress: { street: '123 Main St', city: 'Spokane', state: 'WA', zip: '99201' },
        totalPrice: 12.99,
        placedAt,
      },
    },
    {
      type: 'OrderConfirmed',
      payload: {
        sequenceNumber: 2,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        acceptedBy: 'staff-001',
        estimatedPrepMinutes: 20,
        confirmedAt: now(),
      },
    },
    {
      type: 'PrepStarted',
      payload: {
        sequenceNumber: 3,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        itemId: MOCK_ITEM_ID,
        kitchenStation: 'station-1',
        prepStartedAt: now(),
      },
    },
    {
      type: 'PizzaBaking',
      payload: {
        sequenceNumber: 4,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        itemId: MOCK_ITEM_ID,
        ovenNumber: 2,
        bakingStartedAt: now(),
      },
    },
    {
      type: 'OrderReady',
      payload: {
        sequenceNumber: 5,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        readyAt: now(),
      },
    },
    {
      type: 'DriverAssigned',
      payload: {
        sequenceNumber: 6,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        driverId: 'driver-001',
        assignedAt: now(),
      },
    },
    {
      type: 'OrderDispatched',
      payload: {
        sequenceNumber: 7,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        driverId: 'driver-001',
        dispatchedAt: now(),
      },
    },
    {
      type: 'OrderDelivered',
      payload: {
        sequenceNumber: 8,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        driverId: 'driver-001',
        deliveredAt: now(),
        deliveryDurationMinutes: 22,
      },
    },
  ]
}

// Cancellation scenario
export function buildCancellationEvents(): OrderEvent[] {
  return [
    buildHappyPathEvents()[0],
    buildHappyPathEvents()[1],
    {
      type: 'OrderCancelled',
      payload: {
        sequenceNumber: 3,
        occurredAt: now(),
        orderId: MOCK_ORDER_ID,
        reason: 'Customer requested cancellation',
        cancelledAt: now(),
        refundEligible: true,
      },
    },
  ]
}
