export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'baking'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export type PizzaSize = 'small' | 'medium' | 'large' | 'xlarge'
export type CrustType = 'thin' | 'classic' | 'thick' | 'stuffed'
export type SauceType = 'tomato' | 'white' | 'bbq' | 'pesto' | 'none'
export type CheeseType = 'mozzarella' | 'cheddar' | 'provolone' | 'vegan' | 'none'
export type ToppingPlacement = 'whole' | 'left' | 'right'
export type AmountLevel = 'light' | 'regular' | 'extra'

export interface ToppingSelection {
  toppingId: string
  name: string
  placement: ToppingPlacement
}

export interface CustomizationState {
  size: PizzaSize
  crust: CrustType
  sauce: SauceType
  sauceAmount: AmountLevel
  cheese: CheeseType
  cheeseAmount: AmountLevel
  toppings: ToppingSelection[]
  specialInstructions: string
}

export interface OrderItemViewModel {
  itemId: string
  pizzaId: string
  name: string
  quantity: number
  unitPrice: number
  customization: CustomizationState
  status: OrderStatus | null
  kitchenStation: string | null
  prepStartedAt: string | null
  readyAt: string | null
}

export interface DriverLocation {
  driverId: string
  lat: number
  lng: number
  updatedAt: string
}

export interface OrderViewModel {
  orderId: string
  status: OrderStatus
  customerId: string
  items: OrderItemViewModel[]
  deliveryAddress: DeliveryAddress | null
  fulfillmentType: 'delivery' | 'pickup'
  totalPrice: number
  estimatedReadyAt: string | null
  driver: DriverLocation | null
  lastSequenceNumber: number
  staleSince: number | null
  placedAt: string
}

export interface DeliveryAddress {
  street: string
  city: string
  state: string
  zip: string
  lat?: number
  lng?: number
}

export interface CartItem {
  cartItemId: string
  pizzaId: string
  name: string
  quantity: number
  unitPrice: number
  customization: CustomizationState
}

export interface PizzaSummary {
  id: string
  name: string
  description: string
  basePrice: number
  imageUrl: string | null
  category: string
  popularityBadge: boolean
}

export interface PizzaDetail extends PizzaSummary {
  availableSizes: PizzaSize[]
  availableCrusts: CrustType[]
  availableSauces: SauceType[]
  availableCheeses: CheeseType[]
  availableToppings: ToppingOption[]
  pricingRules: PricingRules
}

export interface ToppingOption {
  id: string
  name: string
  category: 'meat' | 'veggie' | 'cheese' | 'sauce'
  priceModifier: number
}

export interface PricingRules {
  sizePrices: Record<PizzaSize, number>
  crustUpcharge: Record<CrustType, number>
  toppingPrice: number
}

export interface MenuCategory {
  id: string
  name: string
  slug: string
}

// Kitchen / staff models

export interface KitchenOrder {
  orderId: string
  orderNumber: string
  status: OrderStatus
  items: { name: string; quantity: number; notes: string }[]
  placedAt: string
  acceptedAt: string | null
  prepStartedAt: string | null
}

export interface OperationsSnapshot {
  activeOrders: number
  avgPrepTimeMinutes: number
  revenueToday: number
  queueDepth: number
  outOfStockItems: string[]
}
