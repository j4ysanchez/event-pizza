import { produce } from 'immer'
import type { OrderEvent } from '../types/events'
import type { OrderViewModel, OrderItemViewModel, OrderStatus } from '../types/models'

export function initialOrderViewModel(orderId: string): OrderViewModel {
  return {
    orderId,
    status: 'pending',
    customerId: '',
    items: [],
    deliveryAddress: null,
    fulfillmentType: 'delivery',
    totalPrice: 0,
    estimatedReadyAt: null,
    driver: null,
    lastSequenceNumber: -1,
    staleSince: null,
    placedAt: new Date().toISOString(),
  }
}

export function orderReducer(state: OrderViewModel, event: OrderEvent): OrderViewModel {
  // Idempotency: ignore events we've already applied
  if (
    event.type !== 'SnapshotReceived' &&
    event.payload.sequenceNumber <= state.lastSequenceNumber
  ) {
    return state
  }

  return produce(state, (draft) => {
    switch (event.type) {
      case 'OrderPlaced': {
        const { payload } = event
        draft.orderId = payload.orderId
        draft.customerId = payload.customerId
        draft.status = 'pending'
        draft.fulfillmentType = payload.fulfillmentType
        draft.deliveryAddress = payload.deliveryAddress
        draft.totalPrice = payload.totalPrice
        draft.placedAt = payload.placedAt
        draft.items = payload.items.map(
          (item): OrderItemViewModel => ({
            itemId: item.itemId,
            pizzaId: item.pizzaId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customization: {
              size: 'medium',
              crust: 'classic',
              sauce: 'tomato',
              sauceAmount: 'regular',
              cheese: 'mozzarella',
              cheeseAmount: 'regular',
              toppings: [],
              specialInstructions: '',
            },
            status: null,
            kitchenStation: null,
            prepStartedAt: null,
            readyAt: null,
          })
        )
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'OrderConfirmed': {
        const { payload } = event
        draft.status = 'confirmed'
        const estimatedMs = new Date(payload.confirmedAt).getTime() + payload.estimatedPrepMinutes * 60_000
        draft.estimatedReadyAt = new Date(estimatedMs).toISOString()
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'PrepStarted': {
        const { payload } = event
        draft.status = 'preparing'
        const item = draft.items.find((i) => i.itemId === payload.itemId)
        if (item) {
          item.status = 'preparing'
          item.kitchenStation = payload.kitchenStation
          item.prepStartedAt = payload.prepStartedAt
        }
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'PizzaBaking': {
        const { payload } = event
        draft.status = 'baking'
        const item = draft.items.find((i) => i.itemId === payload.itemId)
        if (item) item.status = 'baking'
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'PizzaReady': {
        const { payload } = event
        const item = draft.items.find((i) => i.itemId === payload.itemId)
        if (item) {
          item.status = 'ready'
          item.readyAt = payload.readyAt
        }
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'OrderReady': {
        draft.status = 'ready'
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }

      case 'DriverAssigned': {
        const { payload } = event
        draft.driver = {
          driverId: payload.driverId,
          lat: 0,
          lng: 0,
          updatedAt: payload.assignedAt,
        }
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'OrderDispatched': {
        draft.status = 'dispatched'
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }

      case 'OrderDelivered': {
        draft.status = 'delivered'
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }

      case 'OrderCancelled': {
        // Append-only: status updates but timeline is preserved
        draft.status = 'cancelled'
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }

      case 'OrderFailed': {
        draft.status = 'failed'
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }

      case 'ItemStatusUpdated': {
        const { payload } = event
        const item = draft.items.find((i) => i.itemId === payload.itemId)
        if (item) item.status = payload.status as OrderStatus
        draft.lastSequenceNumber = payload.sequenceNumber
        break
      }

      case 'SnapshotReceived': {
        // Full state replacement from polling fallback — only update seq number
        // The caller is responsible for replacing state wholesale from the snapshot
        draft.lastSequenceNumber = event.payload.sequenceNumber
        break
      }
    }
  })
}
