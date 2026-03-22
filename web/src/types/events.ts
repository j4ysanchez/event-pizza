import { z } from 'zod'
import type { OrderStatus } from './models'

// ─── Common envelope ─────────────────────────────────────────────────────────

const BaseEventFields = {
  sequenceNumber: z.number().int().nonnegative(),
  occurredAt: z.string().datetime(),
  schemaVersion: z.number().int().positive().default(1),
}

// ─── Order event payloads ─────────────────────────────────────────────────────

const OrderItemSchema = z.object({
  itemId: z.string(),
  pizzaId: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
})

const DeliveryAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const OrderPlacedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  customerId: z.string(),
  items: z.array(OrderItemSchema),
  fulfillmentType: z.enum(['delivery', 'pickup']),
  deliveryAddress: DeliveryAddressSchema.nullable(),
  totalPrice: z.number().nonnegative(),
  placedAt: z.string().datetime(),
}).passthrough()

const OrderConfirmedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  acceptedBy: z.string(),
  estimatedPrepMinutes: z.number().int().positive(),
  confirmedAt: z.string().datetime(),
}).passthrough()

const PrepStartedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  itemId: z.string(),
  kitchenStation: z.string(),
  prepStartedAt: z.string().datetime(),
}).passthrough()

const PizzaBakingPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  itemId: z.string(),
  ovenNumber: z.number().int(),
  bakingStartedAt: z.string().datetime(),
}).passthrough()

const PizzaReadyPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  itemId: z.string(),
  readyAt: z.string().datetime(),
}).passthrough()

const OrderReadyPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  readyAt: z.string().datetime(),
}).passthrough()

const DriverAssignedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  driverId: z.string(),
  assignedAt: z.string().datetime(),
}).passthrough()

const OrderDispatchedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  driverId: z.string(),
  dispatchedAt: z.string().datetime(),
}).passthrough()

const OrderDeliveredPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  driverId: z.string(),
  deliveredAt: z.string().datetime(),
  deliveryDurationMinutes: z.number().int().positive(),
}).passthrough()

const OrderCancelledPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  reason: z.string(),
  cancelledAt: z.string().datetime(),
  refundEligible: z.boolean(),
}).passthrough()

const OrderFailedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  reason: z.string(),
  failedAt: z.string().datetime(),
  refundEligible: z.boolean(),
}).passthrough()

const ItemStatusUpdatedPayloadSchema = z.object({
  ...BaseEventFields,
  orderId: z.string().uuid(),
  itemId: z.string(),
  status: z.string(),
  updatedAt: z.string().datetime(),
}).passthrough()

// Synthetic client-side event for SSE drop + poll recovery
const SnapshotReceivedPayloadSchema = z.object({
  sequenceNumber: z.number().int(),
  orderId: z.string().uuid(),
})

// ─── Discriminated union ──────────────────────────────────────────────────────

export const OrderEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('OrderPlaced'), payload: OrderPlacedPayloadSchema }),
  z.object({ type: z.literal('OrderConfirmed'), payload: OrderConfirmedPayloadSchema }),
  z.object({ type: z.literal('PrepStarted'), payload: PrepStartedPayloadSchema }),
  z.object({ type: z.literal('PizzaBaking'), payload: PizzaBakingPayloadSchema }),
  z.object({ type: z.literal('PizzaReady'), payload: PizzaReadyPayloadSchema }),
  z.object({ type: z.literal('OrderReady'), payload: OrderReadyPayloadSchema }),
  z.object({ type: z.literal('DriverAssigned'), payload: DriverAssignedPayloadSchema }),
  z.object({ type: z.literal('OrderDispatched'), payload: OrderDispatchedPayloadSchema }),
  z.object({ type: z.literal('OrderDelivered'), payload: OrderDeliveredPayloadSchema }),
  z.object({ type: z.literal('OrderCancelled'), payload: OrderCancelledPayloadSchema }),
  z.object({ type: z.literal('OrderFailed'), payload: OrderFailedPayloadSchema }),
  z.object({ type: z.literal('ItemStatusUpdated'), payload: ItemStatusUpdatedPayloadSchema }),
  z.object({ type: z.literal('SnapshotReceived'), payload: SnapshotReceivedPayloadSchema }),
])

export type OrderEvent = z.infer<typeof OrderEventSchema>
export type OrderEventType = OrderEvent['type']

// ─── Driver location events (separate SSE stream) ─────────────────────────────

export const DriverLocationEventSchema = z.object({
  driverId: z.string(),
  lat: z.number(),
  lng: z.number(),
  updatedAt: z.string().datetime(),
  sequenceNumber: z.number().int(),
})

export type DriverLocationEvent = z.infer<typeof DriverLocationEventSchema>

// ─── Operations events (kitchen/manager SSE stream) ───────────────────────────

export const OperationsEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('OrderStatusChanged'),
    payload: z.object({
      orderId: z.string().uuid(),
      orderNumber: z.string(),
      fromStatus: z.string() as z.ZodType<OrderStatus>,
      toStatus: z.string() as z.ZodType<OrderStatus>,
      changedAt: z.string().datetime(),
      items: z.array(z.object({ name: z.string(), quantity: z.number().int() })),
    }),
  }),
  z.object({
    type: z.literal('MetricsUpdated'),
    payload: z.object({
      activeOrders: z.number().int(),
      avgPrepTimeMinutes: z.number(),
      revenueToday: z.number(),
      queueDepth: z.number().int(),
      outOfStockItems: z.array(z.string()),
      updatedAt: z.string().datetime(),
    }),
  }),
  z.object({
    type: z.literal('NewOrderReceived'),
    payload: z.object({
      orderId: z.string().uuid(),
      orderNumber: z.string(),
      items: z.array(z.object({ name: z.string(), quantity: z.number().int() })),
      placedAt: z.string().datetime(),
    }),
  }),
])

export type OperationsEvent = z.infer<typeof OperationsEventSchema>
