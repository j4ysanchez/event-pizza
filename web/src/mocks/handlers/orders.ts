import { http, HttpResponse } from 'msw'
import { MOCK_ORDER_ID, buildOrderSnapshot } from '../data/order.fixtures'

export const ordersHandlers = [
  http.get('/api/orders/:orderId', ({ params }) => {
    const snapshot = buildOrderSnapshot({ orderId: params.orderId as string })
    return HttpResponse.json(snapshot, {
      headers: { 'X-Causality-Token': `mock-token-${Date.now()}` },
    })
  }),

  http.post('/api/orders', async () => {
    await new Promise((r) => setTimeout(r, 800)) // simulate latency
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
