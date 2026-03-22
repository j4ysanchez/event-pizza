import { useReducer, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSSEConnection } from '../../hooks/useSSEConnection'
import { orderReducer, initialOrderViewModel } from '../../reducers/orderReducer'
import { OrderEventSchema } from '../../types/events'
import { useUIStore } from '../../store/uiStore'
import type { OrderViewModel } from '../../types/models'
import type { OrderEvent } from '../../types/events'
import type { OrderSnapshotResponse } from '../../types/api'
import { fetchOrderSnapshot } from '../orders'

interface UseOrderEventStreamResult {
  orderViewModel: OrderViewModel
  isConnected: boolean
  isStale: boolean
  reconnectAttempt: number
}

const KNOWN_ORDER_EVENT_TYPES = new Set<string>([
  'OrderPlaced',
  'OrderConfirmed',
  'PrepStarted',
  'PizzaBaking',
  'PizzaReady',
  'OrderReady',
  'DriverAssigned',
  'OrderDispatched',
  'OrderDelivered',
  'OrderCancelled',
  'OrderFailed',
  'ItemStatusUpdated',
  'SnapshotReceived',
])

export function useOrderEventStream(orderId: string): UseOrderEventStreamResult {
  const [orderViewModel, dispatch] = useReducer(
    orderReducer,
    orderId,
    initialOrderViewModel
  )

  const setLiveUpdatesPaused = useUIStore((s) => s.setLiveUpdatesPaused)

  const { isConnected, isStale, reconnectAttempt } = useSSEConnection(
    `/api/sse/orders/${orderId}`,
    OrderEventSchema,
    (event: OrderEvent) => dispatch(event),
    { knownTypes: KNOWN_ORDER_EVENT_TYPES }
  )

  // Sync stale state into UI store (shows banner globally)
  useEffect(() => {
    setLiveUpdatesPaused(isStale)
    return () => setLiveUpdatesPaused(false)
  }, [isStale, setLiveUpdatesPaused])

  // Fallback polling when SSE is stale
  useQuery<OrderSnapshotResponse>({
    queryKey: ['orders', orderId, 'poll'],
    queryFn: () => fetchOrderSnapshot(orderId),
    enabled: isStale,
    refetchInterval: isStale ? 10_000 : false,
    // On successful poll, synthesize a SnapshotReceived event
    // The snapshot replaces the view model wholesale
    select: (data) => data,
  })

  // Hydrate from initial REST snapshot
  const { data: snapshot } = useQuery<OrderSnapshotResponse>({
    queryKey: ['orders', orderId],
    queryFn: () => fetchOrderSnapshot(orderId),
    enabled: !!orderId,
    // Only fires once on mount; SSE takes over after that
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!snapshot) return
    dispatch({
      type: 'OrderPlaced',
      payload: {
        sequenceNumber: snapshot.lastSequenceNumber,
        occurredAt: snapshot.placedAt,
        orderId: snapshot.orderId,
        customerId: snapshot.customerId,
        items: snapshot.items.map((item) => ({
          itemId: item.itemId,
          pizzaId: item.pizzaId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        fulfillmentType: snapshot.fulfillmentType,
        deliveryAddress: snapshot.deliveryAddress,
        totalPrice: snapshot.totalPrice,
        placedAt: snapshot.placedAt,
      },
    })
  }, [snapshot])

  return { orderViewModel, isConnected, isStale, reconnectAttempt }
}
