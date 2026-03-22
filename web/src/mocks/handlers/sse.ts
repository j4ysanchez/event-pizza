import { http } from 'msw'
import { buildHappyPathEvents, buildPickupHappyPathEvents } from '../data/order.fixtures'
import { mockFulfillmentType } from './orders'
import type { OperationsEvent } from '../../types/events'

function makeSSEStream(events: unknown[], delayMs = 1500): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      events.forEach((event, i) => {
        setTimeout(() => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          if (i === events.length - 1) {
            // Keep connection open after last event
          }
        }, i * delayMs)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

const mockDriverRoute = [
  { lat: 47.658, lng: -117.426 },
  { lat: 47.659, lng: -117.423 },
  { lat: 47.661, lng: -117.420 },
  { lat: 47.663, lng: -117.417 },
  { lat: 47.665, lng: -117.414 },
]

const mockOperationsEvents: OperationsEvent[] = [
  {
    type: 'MetricsUpdated',
    payload: {
      activeOrders: 5,
      avgPrepTimeMinutes: 18,
      revenueToday: 847.50,
      queueDepth: 3,
      outOfStockItems: [],
      updatedAt: new Date().toISOString(),
    },
  },
  {
    type: 'NewOrderReceived',
    payload: {
      orderId: '00000000-0000-0000-0000-000000000099',
      orderNumber: '42',
      items: [{ name: 'Pepperoni', quantity: 2 }],
      placedAt: new Date().toISOString(),
    },
  },
]

export const sseHandlers = [
  http.get('/api/sse/orders/:orderId', () =>
    makeSSEStream(
      mockFulfillmentType === 'pickup' ? buildPickupHappyPathEvents() : buildHappyPathEvents(),
      2000
    )
  ),

  http.get('/api/sse/delivery/:orderId', () => {
    const driverEvents = mockDriverRoute.map((pos, i) => ({
      driverId: 'driver-001',
      lat: pos.lat,
      lng: pos.lng,
      updatedAt: new Date().toISOString(),
      sequenceNumber: i + 1,
    }))
    return makeSSEStream(driverEvents, 3000)
  }),

  http.get('/api/sse/operations', () =>
    makeSSEStream(mockOperationsEvents, 2000)
  ),
]
