import { test, expect } from '@playwright/test'

test.describe('SSE resilience', () => {
  test('shows "Live updates paused" banner when SSE connection drops', async ({ page }) => {
    // Navigate to tracking page for the mock order
    const mockOrderId = '00000000-0000-0000-0000-000000000042'
    await page.goto(`/order/${mockOrderId}/track`)

    // Wait for SSE connection to establish and first event to arrive
    await expect(page.getByText(/live/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Order Placed')).toBeVisible({ timeout: 10_000 })

    // Abort the SSE connection to simulate a drop
    await page.route('/api/sse/orders/*', (route) => route.abort())

    // The stale banner should appear in the CustomerLayout header
    // The banner text is "Live updates paused" from CustomerLayout's liveUpdatesPaused state
    await expect(page.getByText(/live updates paused/i)).toBeVisible({ timeout: 15_000 })
  })

  test('shows reconnecting state in order tracking connection indicator', async ({ page }) => {
    const mockOrderId = '00000000-0000-0000-0000-000000000042'

    // Block SSE from the start
    await page.route('/api/sse/orders/*', (route) => route.abort())

    await page.goto(`/order/${mockOrderId}/track`)

    // Should show reconnecting or stale state
    await expect(
      page.getByText(/reconnecting/i).or(page.getByText(/live updates paused/i))
    ).toBeVisible({ timeout: 15_000 })
  })
})
