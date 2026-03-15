import { http, HttpResponse } from 'msw'
import { CATEGORIES, PIZZAS, PIZZA_DETAIL } from '../data/menu.fixtures'

export const menuHandlers = [
  http.get('/api/menu/categories', () => HttpResponse.json(CATEGORIES)),

  http.get('/api/menu/pizzas', ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const pizzas = category ? PIZZAS.filter((p) => p.category === category) : PIZZAS
    return HttpResponse.json(pizzas)
  }),

  http.get('/api/menu/pizzas/:pizzaId', ({ params }) => {
    if (params.pizzaId === PIZZA_DETAIL.id) {
      return HttpResponse.json(PIZZA_DETAIL)
    }
    const pizza = PIZZAS.find((p) => p.id === params.pizzaId)
    if (!pizza) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Pizza not found' }, { status: 404 })
    return HttpResponse.json({ ...PIZZA_DETAIL, ...pizza })
  }),
]
