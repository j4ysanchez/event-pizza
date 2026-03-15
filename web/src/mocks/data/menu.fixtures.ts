import type { MenuCategory, PizzaSummary, PizzaDetail } from '../../types/models'

export const CATEGORIES: MenuCategory[] = [
  { id: 'classic', name: 'Classic', slug: 'classic' },
  { id: 'specialty', name: 'Specialty', slug: 'specialty' },
  { id: 'build-your-own', name: 'Build Your Own', slug: 'build-your-own' },
  { id: 'sides', name: 'Sides', slug: 'sides' },
]

export const PIZZAS: PizzaSummary[] = [
  {
    id: 'pizza-margherita',
    name: 'Margherita',
    description: 'San Marzano tomatoes, fresh mozzarella, basil',
    basePrice: 12.99,
    imageUrl: null,
    category: 'classic',
    popularityBadge: true,
  },
  {
    id: 'pizza-pepperoni',
    name: 'Pepperoni',
    description: 'Generous pepperoni, mozzarella, tomato sauce',
    basePrice: 13.99,
    imageUrl: null,
    category: 'classic',
    popularityBadge: true,
  },
  {
    id: 'pizza-bbq-chicken',
    name: 'BBQ Chicken',
    description: 'Grilled chicken, red onion, smoky BBQ sauce, cheddar',
    basePrice: 15.99,
    imageUrl: null,
    category: 'specialty',
    popularityBadge: false,
  },
  {
    id: 'pizza-veggie',
    name: 'Garden Veggie',
    description: 'Bell peppers, mushrooms, olives, red onion, pesto',
    basePrice: 13.49,
    imageUrl: null,
    category: 'specialty',
    popularityBadge: false,
  },
]

export const PIZZA_DETAIL: PizzaDetail = {
  ...PIZZAS[0],
  availableSizes: ['small', 'medium', 'large', 'xlarge'],
  availableCrusts: ['thin', 'classic', 'thick', 'stuffed'],
  availableSauces: ['tomato', 'white', 'bbq', 'pesto', 'none'],
  availableCheeses: ['mozzarella', 'cheddar', 'provolone', 'vegan', 'none'],
  availableToppings: [
    { id: 'pepperoni', name: 'Pepperoni', category: 'meat', priceModifier: 1.5 },
    { id: 'sausage', name: 'Italian Sausage', category: 'meat', priceModifier: 1.5 },
    { id: 'mushroom', name: 'Mushrooms', category: 'veggie', priceModifier: 1.0 },
    { id: 'bell-pepper', name: 'Bell Peppers', category: 'veggie', priceModifier: 1.0 },
    { id: 'red-onion', name: 'Red Onion', category: 'veggie', priceModifier: 1.0 },
    { id: 'olive', name: 'Black Olives', category: 'veggie', priceModifier: 1.0 },
    { id: 'jalapeno', name: 'Jalapeños', category: 'veggie', priceModifier: 1.0 },
    { id: 'extra-cheese', name: 'Extra Cheese', category: 'cheese', priceModifier: 1.25 },
  ],
  pricingRules: {
    sizePrices: { small: 10.99, medium: 12.99, large: 15.99, xlarge: 18.99 },
    crustUpcharge: { thin: 0, classic: 0, thick: 1.0, stuffed: 2.5 },
    toppingPrice: 1.25,
  },
}
