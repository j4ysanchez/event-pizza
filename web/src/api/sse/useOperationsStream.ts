import { useReducer } from 'react'
import { produce } from 'immer'
import { useSSEConnection } from '../../hooks/useSSEConnection'
import { OperationsEventSchema } from '../../types/events'
import type { OperationsEvent } from '../../types/events'
import type { KitchenOrder, OperationsSnapshot, OrderStatus } from '../../types/models'

interface OperationsState {
  kanban: Record<OrderStatus, KitchenOrder[]>
  metrics: OperationsSnapshot
  lastSequenceNumber: number
}

const KANBAN_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'baking', 'ready', 'dispatched',
]

const initialMetrics: OperationsSnapshot = {
  activeOrders: 0,
  avgPrepTimeMinutes: 0,
  revenueToday: 0,
  queueDepth: 0,
  outOfStockItems: [],
}

function buildInitialKanban(): Record<OrderStatus, KitchenOrder[]> {
  return Object.fromEntries(
    KANBAN_STATUSES.map((s) => [s, []])
  ) as Record<OrderStatus, KitchenOrder[]>
}

function operationsReducer(state: OperationsState, event: OperationsEvent): OperationsState {
  return produce(state, (draft) => {
    switch (event.type) {
      case 'NewOrderReceived': {
        const { payload } = event
        draft.kanban['pending'].push({
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          status: 'pending',
          items: payload.items.map((i) => ({ name: i.name, quantity: i.quantity, notes: '' })),
          placedAt: payload.placedAt,
          acceptedAt: null,
          prepStartedAt: null,
        })
        break
      }

      case 'OrderStatusChanged': {
        const { fromStatus, toStatus, orderId } = event.payload
        const fromCol = draft.kanban[fromStatus]
        const orderIndex = fromCol?.findIndex((o) => o.orderId === orderId) ?? -1
        if (orderIndex !== -1 && fromCol) {
          const [order] = fromCol.splice(orderIndex, 1)
          order.status = toStatus
          draft.kanban[toStatus]?.push(order)
        }
        break
      }

      case 'MetricsUpdated': {
        const { payload } = event
        draft.metrics = {
          activeOrders: payload.activeOrders,
          avgPrepTimeMinutes: payload.avgPrepTimeMinutes,
          revenueToday: payload.revenueToday,
          queueDepth: payload.queueDepth,
          outOfStockItems: payload.outOfStockItems,
        }
        break
      }
    }
  })
}

interface UseOperationsStreamResult {
  kanban: Record<OrderStatus, KitchenOrder[]>
  metrics: OperationsSnapshot
  isConnected: boolean
  isStale: boolean
}

export function useOperationsStream(): UseOperationsStreamResult {
  const [state, dispatch] = useReducer(operationsReducer, {
    kanban: buildInitialKanban(),
    metrics: initialMetrics,
    lastSequenceNumber: -1,
  })

  const { isConnected, isStale } = useSSEConnection(
    '/api/sse/operations',
    OperationsEventSchema,
    (event: OperationsEvent) => dispatch(event)
  )

  return {
    kanban: state.kanban,
    metrics: state.metrics,
    isConnected,
    isStale,
  }
}
