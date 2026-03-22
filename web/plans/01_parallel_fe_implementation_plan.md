# Parallel Frontend Implementation Plan

## Current State Summary

- **Phases 0–2 complete**: scaffold, types, MSW, reducer, SSE hooks, stores
- **Phase 3 gap**: `CustomizePizzaSheet` is entirely missing — the "Customize" button in `MenuBrowseView` is wired to `uiStore.setCustomizeSheet` but nothing renders the sheet
- **Phase 4**: `CheckoutView` and `OrderTrackingView` functional but `OrderTrackingView` is a monolith (sub-components not extracted)
- **Phase 5**: `KitchenQueueView` working skeleton, `ManagerDashboardView` is a stub (48 lines, no sparkline)
- **E2E**: Playwright not installed or configured

## Shared Contracts (read-only for all agents)

Do not modify these files — all agents depend on them:

- `src/types/` — all model and event types
- `src/store/cartStore.ts`, `src/store/uiStore.ts`
- `src/hooks/useSSEConnection.ts`
- `src/reducers/orderReducer.ts`
- `src/mocks/` — mock handlers and fixtures
- `src/api/sse/useOrderEventStream.ts`, `useOperationsStream.ts`, `useDeliveryStream.ts`

## Merge Order

All 4 agents can work fully in parallel. At merge time:

1. Agent 1 is the only one that modifies `CustomerLayout.tsx` — no conflicts with others
2. Agents 2 and 3 only create new files and modify their own feature directories — zero conflicts with each other or Agent 1
3. Agent 4 only creates `e2e/` and `playwright.config.ts` — zero conflicts with anyone

---

## Agent 1 — CustomizePizzaSheet (Phase 3 completion)

**Priority: highest.** The core customer journey is broken without this.

### Files to create

| File | Description |
|---|---|
| `src/features/customize/CustomizePizzaSheet.tsx` | Bottom sheet, reads `uiStore.activePizzaId`, fetches `PizzaDetail` via React Query |
| `src/features/customize/ToppingSelector.tsx` | Grid of topping chips grouped by category (meat, veggie, cheese, sauce) |
| `src/features/customize/HalfWholeToggle.tsx` | Three-state toggle per topping: whole / left-half / right-half, uses `ToppingPlacement` from models |
| `src/components/pizza/PizzaVisualizer.tsx` | Pure SVG `viewBox="0 0 200 200"`, seeded pseudo-random scatter for toppings, `clipPath` for half-toppings |

### Files to modify

| File | Change |
|---|---|
| `src/components/layout/CustomerLayout.tsx` | Add `<CustomizePizzaSheet />` alongside the existing `<CartDrawer />` |

### Key behaviors

- Internal `useState` for ephemeral customization state (size, crust, sauce, toppings) — not Zustand
- Price recalculates live from `PizzaDetail.pricingRules` (client-side, no extra fetch)
- "Add to Cart" calls `cartStore.addItem(...)`, closes the sheet, resets local state
- Sheet body is scrollable; size/crust/sauce use pill group selectors; toppings use `HalfWholeToggle`
- Fetch endpoint: `GET /api/menu/pizzas/:id` — MSW handler already exists in `src/mocks/handlers/menu.ts`

### PizzaVisualizer notes

- Same topping selection always produces the same visual: use a seeded PRNG (e.g. `Math.sin(seed) * 10000 % 1`)
- Half-toppings: `left` = `clipPath` clipping to left semicircle, `right` = right semicircle
- Toppings are colored dots/shapes; no image assets needed

### Do not touch

`features/tracking/`, `features/kitchen/`, `features/manager/`, `e2e/`

---

## Agent 2 — Staff App Completion (Phase 5)

### Files to create

| File | Description |
|---|---|
| `src/features/kitchen/OrderTicket.tsx` | Order card with order number, item list, elapsed time, one-tap advance button |
| `src/features/kitchen/TimerBadge.tsx` | `setInterval(1000)` ticker, amber at ≥15 min, red at ≥25 min |
| `src/features/kitchen/KanbanBoard.tsx` | Board layout extracted from `KitchenQueueView` |
| `src/features/manager/SparklineChart.tsx` | Pure SVG `<polyline>`, 60-point rolling window, no charting library |
| `src/features/manager/LiveWidget.tsx` | Wraps metric display with optional sparkline |
| `src/features/orderDetail/OrderDetailSheet.tsx` | Slide-in panel triggered from `OrderTicket`, shows full order detail |
| `src/features/orderDetail/OrderEventLog.tsx` | Raw JSON per event row, collapsed by default, invaluable for debugging |

### Files to modify

| File | Change |
|---|---|
| `src/features/kitchen/KitchenQueueView.tsx` | Refactor to compose the new extracted components |
| `src/features/manager/ManagerDashboardView.tsx` | Add `SparklineChart` for queue depth, wire `LiveWidget` for each metric |

### Key behaviors

**OrderTicket advance button:**
- One-tap advances the order to the next status: `POST /api/orders/:id/advance`
- Staff never drag cards — only the button moves them
- Label changes per current status: "Confirm", "Start Prep", "Oven In", "Ready", "Dispatch"

**Sound alerts:**
- Gate `AudioContext` behind an "Enable Alerts" button — browsers block audio before a user gesture
- Use Web Audio API programmatic beep (no asset files): `OscillatorNode` with short envelope
- Store enabled state in component-local state (not Zustand)
- Trigger on new order arriving in the `pending` column

**SparklineChart:**
- Accepts `data: number[]` (up to 60 points) and `width`, `height` props
- Normalize values to fit the SVG viewport
- No axes, no labels — purely visual trend indicator

### Do not touch

`features/customize/`, `features/tracking/`, `e2e/`

---

## Agent 3 — OrderTrackingView Polish (Phase 4)

### Files to create

| File | Description |
|---|---|
| `src/features/tracking/StatusTimeline.tsx` | Extracted from `OrderTrackingView`, CSS `@keyframes` slide-in on new events, append-only |
| `src/features/tracking/ETAWindow.tsx` | Extracted `getETAWindow` logic, shows time range — never a countdown |
| `src/features/tracking/PizzaStatusCard.tsx` | Per-item card driven by `OrderItemViewModel.status` and `kitchenStation` |
| `src/features/tracking/DriverTrackerMap.tsx` | Leaflet map driven by `useDeliveryStream`, only renders when `fulfillmentType === 'delivery'` |

### Files to modify

| File | Change |
|---|---|
| `src/features/tracking/OrderTrackingView.tsx` | Compose the extracted components, wire `DriverTrackerMap` |

### Key behaviors

**StatusTimeline:**
- Append-only — never removes or reorders prior entries
- New event animates in from the bottom with CSS `@keyframes` (translate + fade)
- Cancelled/failed states append to the timeline rather than replacing it

**DriverTrackerMap:**
- Import `import 'leaflet/dist/leaflet.css'` inside this component
- Uses the already-existing `useDeliveryStream` hook at `src/api/sse/useDeliveryStream.ts`
- Center map on driver location, update marker position as SSE events arrive
- Only mount this component when `orderViewModel.fulfillmentType === 'delivery'`
- Fix Leaflet default marker icon (known issue with Vite): override `L.Icon.Default.prototype._getIconUrl`

**ETAWindow:**
- Displays a window (e.g. "2:10 PM – 2:20 PM"), never counts down
- Only renders when `orderViewModel.estimatedReadyAt` is non-null

### Do not touch

`features/customize/`, `features/kitchen/`, `features/manager/`, `e2e/`

---

## Agent 4 — Playwright E2E Setup

### Install

Inside `web/`:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

### Files to create

| File | Description |
|---|---|
| `playwright.config.ts` | Config targeting `http://localhost:5173`, `webServer` launches `pnpm dev` |
| `e2e/customer-journey.spec.ts` | Happy path: browse menu, quick-add to cart, checkout, verify tracking timeline advances |
| `e2e/customize-flow.spec.ts` | Open `CustomizePizzaSheet`, select toppings with half/whole toggle, add to cart, verify cart contents |
| `e2e/kitchen-queue.spec.ts` | Navigate to `/staff/kitchen`, verify orders appear in Kanban columns, advance an order |
| `e2e/sse-resilience.spec.ts` | Verify "Live updates paused" banner appears on SSE connection drop |

### playwright.config.ts structure

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
})
```

### MSW strategy

MSW runs automatically in dev mode (`import.meta.env.DEV`). Playwright drives a real Chromium browser against `vite dev`, so MSW intercepts all API calls — no backend needed. The SSE mock streams events at 2s intervals, so the tracking timeline will animate during tests.

### Test writing guidance

- Prefer `getByRole` and `getByText` over `data-testid` where semantically clear
- Add `data-testid` only to existing rendered elements where role/text is ambiguous — do not modify files owned by other agents
- For SSE-driven UI, use `waitFor` / `expect(locator).toBeVisible()` with Playwright's auto-retry
- Set `test.setTimeout(30_000)` for tracking tests (mock stream runs at 2s intervals × ~8 events)
- For `sse-resilience.spec.ts`: use `page.route('/api/sse/orders/*', route => route.abort())` to simulate a drop, then assert the stale banner

### Existing elements safe to add data-testid to

These files are not owned by other agents and can be annotated:

- `src/features/menu/MenuBrowseView.tsx` — pizza cards, customize button, quick-add button
- `src/features/checkout/CheckoutView.tsx` — fulfillment toggle, place order button
- `src/features/tracking/OrderTrackingView.tsx` — connection indicator, timeline items (before Agent 3 refactors; coordinate if needed)
- `src/components/cart/CartDrawer.tsx` — checkout button, item rows
- `src/components/layout/CustomerLayout.tsx` — cart icon button, live-updates banner

### Do not touch

Any `src/` files owned by Agents 1, 2, or 3 (i.e. `features/customize/`, `features/kitchen/`, `features/manager/`, `features/orderDetail/`, `features/tracking/`, `components/pizza/`)
