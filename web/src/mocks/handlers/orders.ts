import { http, HttpResponse } from 'msw'
import { MOCK_ORDER_ID, buildOrderSnapshot } from '../data/order.fixtures'

// Shared mock state so the SSE handler can match the fulfillment type
export let mockFulfillmentType: 'delivery' | 'pickup' = 'delivery'

export const ordersHandlers = [
  http.get('/api/orders/:orderId', ({ params }) => {
    const snapshot = buildOrderSnapshot({
      orderId: params.orderId as string,
      fulfillmentType: mockFulfillmentType,
      deliveryAddress: mockFulfillmentType === 'pickup' ? null : {
        street: '123 Main St',
        city: 'Spokane',
        state: 'WA',
        zip: '99201',
      },
    })
    return HttpResponse.json(snapshot, {
      headers: { 'X-Causality-Token': `mock-token-${Date.now()}` },
    })
  }),

  http.post('/api/orders', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 800)) // simulate latency
    const body = await request.json() as { fulfillmentType?: 'delivery' | 'pickup' }
    mockFulfillmentType = body.fulfillmentType ?? 'delivery'
    return HttpResponse.json(
      {
        orderId: MOCK_ORDER_ID,
        status: 'pending',
        paymentIntentClientSecret: 'pi_mock_secret_test',
        causalityToken: `mock-token-${Date.now()}`,
      },
      {
        headers: {
          'X-Causality-Token': `mock-token-${Date.now()}`,
        },
      }
    )
  }),
]
