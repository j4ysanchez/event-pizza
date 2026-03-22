import { useState, useEffect, useRef, useCallback } from 'react'
import type { KitchenOrder, OrderStatus } from '../../types/models'
import { OrderTicket } from './OrderTicket'
import { OrderDetailSheet } from '../orderDetail/OrderDetailSheet'

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'New' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Prep' },
  { status: 'baking', label: 'Baking' },
  { status: 'ready', label: 'Ready' },
  { status: 'dispatched', label: 'Dispatched' },
]

interface KanbanBoardProps {
  kanban: Record<OrderStatus, KitchenOrder[]>
}

function useNewOrderAlert(pendingOrders: KitchenOrder[]) {
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const prevCountRef = useRef(pendingOrders.length)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  }, [])

  useEffect(() => {
    if (alertsEnabled && pendingOrders.length > prevCountRef.current) {
      playBeep()
    }
    prevCountRef.current = pendingOrders.length
  }, [pendingOrders.length, alertsEnabled, playBeep])

  function toggleAlerts() {
    if (!alertsEnabled) {
      audioCtxRef.current = new AudioContext()
      setAlertsEnabled(true)
    } else {
      audioCtxRef.current?.close()
      audioCtxRef.current = null
      setAlertsEnabled(false)
    }
  }

  return { alertsEnabled, toggleAlerts }
}

export function KanbanBoard({ kanban }: KanbanBoardProps) {
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null)
  const pendingOrders = kanban['pending'] ?? []
  const { alertsEnabled, toggleAlerts } = useNewOrderAlert(pendingOrders)

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={toggleAlerts}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            alertsEnabled
              ? 'bg-green-600/20 text-green-400 border border-green-600'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          {alertsEnabled ? 'Alerts On' : 'Enable Alerts'}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => {
          const orders = kanban[status] ?? []
          return (
            <div key={status} className="shrink-0 w-52 flex flex-col">
              <div className="flex items-center justify-between mb-2 sticky top-0 bg-gray-900 z-10 py-1">
                <h2 className="text-sm font-semibold text-gray-300">{label}</h2>
                <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
                  {orders.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {orders.map((order) => (
                  <OrderTicket key={order.orderId} order={order} onSelect={setSelectedOrder} />
                ))}
                {orders.length === 0 && (
                  <div className="text-xs text-gray-600 text-center py-4">Empty</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <OrderDetailSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  )
}
