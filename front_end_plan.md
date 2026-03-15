# Pizza Store Frontend — Implementation Plan

## Phase 0: Scaffold (Day 1)

**Vite + React + TypeScript:**
```bash
pnpm create vite@latest spokane --template react-ts
```

**Key dependencies:**
| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state + fallback polling |
| `zustand` | Cart + UI state |
| `msw` (v2) | Mock Service Worker — browser + Vitest |
| `zod` | Runtime validation of SSE event payloads |
| `uuid` | Idempotency keys on every command |
| `immer` | Clean reducer state transitions |
| `react-router-dom` v6 | Routing |
| `react-leaflet` | Driver tracker map (no API key needed) |
| `@stripe/react-stripe-js` | Payment |

---

## Phase 1: Foundation (Week 1) — Types + API Client + MSW + Routing

**Do this first.** Every other phase depends on it.

1. **`src/types/events.ts`** — Define the full `OrderEvent` discriminated union as Zod schemas. Include `sequenceNumber` in every event payload (needed for SSE gap detection).

2. **`src/types/models.ts`** — Define `OrderViewModel`, which is the client-side projection:
   ```typescript
   interface OrderViewModel {
     orderId: string
     status: OrderStatus
     items: OrderItemViewModel[]
     events: OrderEvent[]       // append-only
     lastSequenceNumber: number
     staleSince: number | null  // when SSE last dropped
   }
   ```

3. **`src/api/client.ts`** — Base fetch wrapper that:
   - Injects `X-Command-Id` (UUID) on every mutation — idempotency key
   - Injects `X-Causality-Token` from Zustand — read-your-own-writes
   - Treats HTTP 409 (duplicate command) as success, not error

4. **`src/mocks/`** — MSW handlers for all routes including SSE simulation via `ReadableStream`. Start MSW in `main.tsx` when `import.meta.env.DEV`. This makes every view buildable/testable without a backend.

5. **Routing shell** — two layout trees: `CustomerLayout` and `StaffLayout`:
   ```
   /menu                      → MenuBrowseView
   /menu/:id/customize        → CustomizePizzaSheet
   /checkout                  → CheckoutView
   /order/:id/track           → OrderTrackingView
   /staff/kitchen             → KitchenQueueView
   /staff/manager             → ManagerDashboardView
   ```

---

## Phase 2: State Core (Week 1–2) — Reducer + SSE Hooks + Stores

**Build state before views.**

**`src/reducers/orderReducer.ts`** — Pure function, test it first:
```typescript
function orderReducer(state: OrderViewModel, event: OrderEvent): OrderViewModel
```
- Use `immer`'s `produce` for clean deep updates
- Must be idempotent — duplicate events (same `sequenceNumber`) are ignored
- `OrderCancelled` appends to the timeline, never removes prior entries

**`src/hooks/useSSEConnection.ts`** — Low-level SSE hook:
- Tracks `lastSequenceNumber` in a `ref`
- On reconnect, appends `?after={lastSeq}` to URL (server replay)
- Backoff: `Math.min(1000 * 2^attempt, 30000)` ms
- After 3 failed reconnects → sets `isStale: true` → triggers 10s polling fallback
- Parses events through Zod — malformed events log errors and are skipped

**`src/api/sse/useOrderEventStream.ts`** — Composes the above with `useReducer`:
```typescript
function useOrderEventStream(orderId: string): {
  orderViewModel: OrderViewModel
  isConnected: boolean
  isStale: boolean
}
```
When `isStale`, activates a React Query `refetchInterval: 10_000` fallback. On reconnect, cancels it.

**Zustand stores:**
- `cartStore` — items, add/remove/undo, persisted to `localStorage` (`persist` middleware)
- `uiStore` — drawer open states, `causalityToken`, `liveUpdatesPaused`

---

## Phase 3: Customer App — Menu → Cart (Week 2)

Build in user-journey order.

**`MenuBrowseView`** — React Query fetches categories + pizzas. Category pills filter the `PizzaCardGrid`. Menu cached in `localStorage` with 5-min TTL (React Query `staleTime`).

**`CustomizePizzaSheet`** — Bottom sheet / side panel. Internal `useState` for ephemeral customization state (size, crust, sauce, toppings). Notable components:
- `HalfWholeToggle` — three-state per topping: whole / left-half / right-half
- `PizzaVisualizer` — pure SVG, `viewBox="0 0 200 200"`. Toppings use seeded pseudo-random scatter so same selection = same visual. Half-toppings use `clipPath`.

**`CartDrawer`** + **`UndoSnackbar`** — 3-second auto-dismiss on remove. Timer tracked in a `useRef` so it can be cancelled on undo.

---

## Phase 4: Customer App — Checkout → Tracking (Week 2–3)

**`CheckoutView`** — React Query mutation with full optimistic update:
1. `onMutate`: generate `commandId = uuid()`, snapshot cart, navigate optimistically to tracking
2. `onError`: restore cart snapshot, navigate back, show error toast
3. `onSuccess`: store `causalityToken` from response headers → clears cart

**`OrderTrackingView`** — SSE-driven via `useOrderEventStream`. Layout:
- `ETAWindow` — shows "15–25 min" range, never a countdown
- `StatusTimeline` — append-only, new events animate in from bottom with CSS `@keyframes`
- `PizzaStatusCard` (per item) — driven by `ItemStatusUpdated` events
- `DriverTrackerMap` — separate `useDeliveryStream` hook on `/sse/delivery/{orderId}`, Leaflet map
- Yellow "Live updates paused" banner when `isStale`

---

## Phase 5: Staff App (Week 3)

**`KitchenQueueView`** — Kanban driven by `useOperationsStream()` (`/sse/operations`). A `kitchenReducer` maintains `Record<OrderStatus, Order[]>`.

**`OrderTicket`** — Large order number, items, elapsed time badge:
- `TimerBadge`: `setInterval(1000)`, amber at 15 min, red at 25 min
- Sound alerts via Web Audio API `AudioContext` (programmatic beep, no asset files). Gate behind "Enable Alerts" button — browsers block audio before user gesture.

**`ManagerDashboardView`** — Reads same `/sse/operations` stream. Sparkline chart is a pure SVG `<polyline>` over a rolling 60-point window — no charting library needed.

**`OrderDetailSheet`** + **`OrderEventLog`** — Expandable raw JSON per event row (collapsed by default, invaluable for debugging).

---

## MSW Mock Strategy

Three modes — same handler code works in all:

| Mode | MSW setup | Backend needed? |
|---|---|---|
| Dev (browser) | `mocks/browser.ts`, starts in `main.tsx` | No |
| Test (Vitest) | `mocks/server.ts`, MSW node adapter | No |
| Prod | MSW not started | Yes |

Predefined scenarios switchable via a dev toolbar: `happyPath`, `cancellation`, `sseDrop`, `slowKitchen`.

**SSE simulation in MSW v2:**
```typescript
http.get('/sse/orders/:orderId', () => {
  const stream = new ReadableStream({
    start(controller) {
      events.forEach((e, i) =>
        setTimeout(() => controller.enqueue(`data: ${JSON.stringify(e)}\n\n`), i * 1500)
      )
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
})
```

---

## Testing Approach

| Layer | Tool | Coverage |
|---|---|---|
| Unit | Vitest | `orderReducer` (all events, idempotency, out-of-order), `cartStore`, SSE backoff logic |
| Integration | RTL + MSW | Each view renders correctly from mock data; SSE events update UI; stale banner appears on disconnect |
| E2E (Phase 7) | Playwright | Full browse → checkout → tracking journey; kitchen status advances |

---

## Build Order Summary

| Phase | What | Why First |
|---|---|---|
| 0 | Scaffold | Everything depends on it |
| 1 | Types + client + MSW + routes | Foundation before any UI |
| 2 | Reducer + SSE hooks + stores | State before views |
| 3 | Menu → Customize → Cart | Core journey, no async complexity |
| 4 | Checkout → Tracking | Requires SSE hooks from Phase 2 |
| 5 | Staff views | Reuses SSE patterns from Phase 4 |

**The single most important file to get right first:** `src/hooks/useSSEConnection.ts`. Every real-time view depends on it. Build and unit-test it in isolation before touching any view.

---

## Folder Structure

```
src/
  api/
    client.ts
    orders.ts
    menu.ts
    sse/
      useOrderEventStream.ts
      useOperationsStream.ts
      useDeliveryStream.ts
      sseClient.ts

  components/
    ui/                    # Button, Card, Badge, Drawer, Snackbar
    pizza/
      PizzaVisualizer.tsx
      PizzaCard.tsx
      PizzaStatusCard.tsx
    cart/
      CartDrawer.tsx
      CartItem.tsx
      UndoSnackbar.tsx
    layout/
      CustomerLayout.tsx
      StaffLayout.tsx

  features/
    menu/
      MenuBrowseView.tsx
      CategoryPills.tsx
      PizzaCardGrid.tsx
    customize/
      CustomizePizzaSheet.tsx
      ToppingSelector.tsx
      HalfWholeToggle.tsx
    checkout/
      CheckoutView.tsx
      DeliveryPickupToggle.tsx
      AddressAutocomplete.tsx
      StripePaymentSection.tsx
    tracking/
      OrderTrackingView.tsx
      StatusTimeline.tsx
      DriverTrackerMap.tsx
      ETAWindow.tsx
    kitchen/
      KitchenQueueView.tsx
      KanbanBoard.tsx
      OrderTicket.tsx
      TimerBadge.tsx
    manager/
      ManagerDashboardView.tsx
      LiveWidget.tsx
      SparklineChart.tsx
    orderDetail/
      OrderDetailSheet.tsx
      OrderEventLog.tsx

  hooks/
    useUndoable.ts
    useSSEConnection.ts
    useStaleProtection.ts

  reducers/
    orderReducer.ts
    orderReducer.test.ts

  store/
    cartStore.ts
    uiStore.ts

  types/
    events.ts
    models.ts
    api.ts

  mocks/
    handlers/
      menu.ts
      orders.ts
      sse.ts
    data/
      menu.fixtures.ts
      order.fixtures.ts
    browser.ts
    server.ts

  routes/
    CustomerRoutes.tsx
    StaffRoutes.tsx
    index.tsx

  main.tsx
  App.tsx
```
