import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { useCartStore } from '../../store/cartStore'
import { useUIStore } from '../../store/uiStore'
import { placeOrder } from '../../api/orders'
import { MOCK_ORDER_ID } from '../../mocks/data/order.fixtures'

export function CheckoutView() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const clearCart = useCartStore((s) => s.clearCart)
  const setCausalityToken = useUIStore((s) => s.setCausalityToken)

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery')
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '' })

  const commandIdRef = { current: uuidv4() }

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      placeOrder({
        commandId: commandIdRef.current,
        items,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? address : null,
        paymentIntentId: 'pi_mock',
      }),
    onSuccess: (data) => {
      setCausalityToken(data.causalityToken)
      clearCart()
      navigate(`/order/${data.orderId}/track`)
    },
  })

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">Your cart is empty.</p>
        <button
          onClick={() => navigate('/menu')}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Fulfillment toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 mb-6">
        {(['delivery', 'pickup'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFulfillmentType(type)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              fulfillmentType === type ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Address form */}
      {fulfillmentType === 'delivery' && (
        <div className="space-y-3 mb-6">
          <input
            placeholder="Street address"
            value={address.street}
            onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <input
              placeholder="City"
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="State"
              value={address.state}
              onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
              className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="ZIP"
              value={address.zip}
              onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        {items.map((item) => (
          <div key={item.cartItemId} className="flex justify-between text-sm py-1">
            <span>{item.quantity}× {item.name}</span>
            <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4">
          {error instanceof Error ? error.message : 'Failed to place order. Please try again.'}
        </p>
      )}

      <button
        onClick={() => mutate()}
        disabled={isPending}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Placing Order...' : `Place Order — $${totalPrice.toFixed(2)}`}
      </button>
    </div>
  )
}
