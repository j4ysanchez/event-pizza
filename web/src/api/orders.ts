import { api } from './client'
import type { PlaceOrderCommand, PlaceOrderResponse, OrderSnapshotResponse } from '../types/api'

export const fetchOrderSnapshot = (orderId: string) =>
  api.get<OrderSnapshotResponse>(`/orders/${orderId}`)

export const placeOrder = (command: PlaceOrderCommand) =>
  api.post<PlaceOrderResponse>('/orders', command, command.commandId)
