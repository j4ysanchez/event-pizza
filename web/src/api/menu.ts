import { api } from './client'
import type { MenuCategory, PizzaSummary, PizzaDetail } from '../types/models'

export const fetchCategories = () =>
  api.get<MenuCategory[]>('/menu/categories')

export const fetchPizzas = (categoryId?: string) =>
  api.get<PizzaSummary[]>(
    categoryId ? `/menu/pizzas?category=${categoryId}` : '/menu/pizzas'
  )

export const fetchPizza = (pizzaId: string) =>
  api.get<PizzaDetail>(`/menu/pizzas/${pizzaId}`)
