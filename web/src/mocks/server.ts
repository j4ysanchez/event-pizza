import { setupServer } from 'msw/node'
import { menuHandlers } from './handlers/menu'
import { ordersHandlers } from './handlers/orders'
import { sseHandlers } from './handlers/sse'

export const server = setupServer(
  ...menuHandlers,
  ...ordersHandlers,
  ...sseHandlers
)
