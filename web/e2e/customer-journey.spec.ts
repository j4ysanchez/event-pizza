import { test, expect } from '@playwright/test'

test.describe('Customer happy path', () => {
  test('browse menu, quick-add to cart, checkout, and track order', async ({ page }) => {
    // Browse menu
    await page.goto('/menu')
    await expect(page.getByRole('heading', { name: 'Pizza Store' }).or(page.getByText('Pizza Store'))).toBeVisible()

    // Wait for pizza cards to load
    await expect(page.getByText('Margherita')).toBeVisible()
    await expect(page.getByText('Pepperoni')).toBeVisible()

    // Quick-add a Margherita to cart
    const margheritaCard = page.locator('text=Margherita').first().locator('..')
    await margheritaCard.locator('..').locator('..').getByRole('button', { name: /add/i }).click()

    // Open cart drawer
    await page.locator('header').getByRole('button').filter({ has: page.locator('svg') }).last().click()

    // Verify cart has the item
    await expect(page.getByText('Your Cart')).toBeVisible()
    await expect(page.getByText('Margherita')).toBeVisible()
    await expect(page.getByText('$12.99')).toBeVisible()

    // Go to checkout
    await page.getByRole('button', { name: 'Checkout' }).click()

    // Verify checkout page
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
    await expect(page.getByText('Order Summary')).toBeVisible()
    await expect(page.getByText('Margherita')).toBeVisible()

    // Place order
    await page.getByRole('button', { name: /place order/i }).click()

    // Should navigate to tracking page
    test.setTimeout(30_000)
    await expect(page.getByText(/order #/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Order Placed')).toBeVisible()

    // Wait for SSE events to advance the timeline (events come at 2s intervals)
    await expect(page.getByText('Order Confirmed')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Prep in Progress')).toBeVisible({ timeout: 10_000 })
  })
})
