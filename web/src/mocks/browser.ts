import { setupWorker } from 'msw/browser'
import { menuHandlers } from './handlers/menu'
import { ordersHandlers } from './handlers/orders'
import { sseHandlers } from './handlers/sse'

export const worker = setupWorker(
  ...menuHandlers,
  ...ordersHandlers,
  ...sseHandlers
)
