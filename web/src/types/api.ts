import type { DeliveryAddress, CartItem } from './models'

// ─── Commands (requests) ──────────────────────────────────────────────────────

export interface PlaceOrderCommand {
  commandId: string  // UUID v4 — idempotency key
  items: CartItem[]
  fulfillmentType: 'delivery' | 'pickup'
  deliveryAddress: DeliveryAddress | null
  paymentIntentId: string
}

export interface AcceptOrderCommand {
  commandId: string
  orderId: string
  estimatedPrepMinutes: number
}

export interface StartPreparationCommand {
  commandId: string
  orderId: string
  itemId: string
  kitchenStation: string
}

export interface MarkPizzaReadyCommand {
  commandId: string
  orderId: string
  itemId: string
}

export interface AssignDriverCommand {
  commandId: string
  orderId: string
  driverId: string
}

export interface MarkDeliveredCommand {
  commandId: string
  orderId: string
}

export interface CancelOrderCommand {
  commandId: string
  orderId: string
  reason: string
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface PlaceOrderResponse {
  orderId: string
  status: 'pending'
  paymentIntentClientSecret: string
  causalityToken: string
}

export interface OrderSnapshotResponse {
  orderId: string
  status: string
  customerId: string
  items: OrderItemResponse[]
  fulfillmentType: 'delivery' | 'pickup'
  deliveryAddress: DeliveryAddress | null
  totalPrice: number
  estimatedReadyAt: string | null
  placedAt: string
  lastSequenceNumber: number
}

export interface OrderItemResponse {
  itemId: string
  pizzaId: string
  name: string
  quantity: number
  unitPrice: number
  status: string | null
  kitchenStation: string | null
  prepStartedAt: string | null
  readyAt: string | null
}

export interface ApiError {
  status: number
  code: string
  message: string
}
