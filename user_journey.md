# Pizza Store — User Journey Diagrams

## Customer Journey

```
┌─────────────┐
│  /menu      │  Browse pizzas, filter by category
│ MenuBrowse  │
└──────┬──────┘
       │  click "Customize"              click "Add" (quick add)
       ├─────────────────────────┐              │
       ▼                         │              │
┌─────────────────┐              │              │
│ CustomizePizza  │  Size, crust,│              │
│     Sheet       │  sauce,      │              │
│                 │  toppings,   │              │
│  PizzaVisualizer│  half/whole  │              │
└────────┬────────┘              │              │
         │  "Add to Cart"        │              │
         └───────────────────────┴──────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │ CartDrawer  │  Review items, remove/undo
                          └──────┬──────┘
                                 │  "Checkout"
                                 ▼
                          ┌─────────────┐
                          │  /checkout  │  Delivery vs pickup,
                          │ CheckoutView│  address, payment
                          └──────┬──────┘
                                 │  Place Order (optimistic nav)
                                 ▼
                     ┌───────────────────────┐
                     │  /order/:id/track     │
                     │  OrderTrackingView    │
                     │                       │
                     │  ┌─────────────────┐  │
                     │  │  StatusTimeline │  │◄── SSE stream
                     │  └─────────────────┘  │    /sse/orders/:id
                     │  ┌─────────────────┐  │
                     │  │   ETAWindow     │  │
                     │  └─────────────────┘  │
                     │  ┌─────────────────┐  │
                     │  │ DriverTrackerMap│  │◄── SSE stream
                     │  └─────────────────┘  │    /sse/delivery/:id
                     └───────────────────────┘
```

---

## Staff Journey

```
                     ┌───────────────────────┐
                     │  /staff/kitchen        │
                     │  KitchenQueueView      │◄── SSE stream
                     │                        │    /sse/operations
                     │  New │ Prep │ Bake │Ready│
                     │  ─── │ ─── │ ─── │────│
                     │  [ ] │ [ ] │ [ ] │ [ ]│  ← OrderTickets
                     │                        │    with elapsed timer
                     └───────────┬────────────┘
                                 │  nav
                                 ▼
                     ┌───────────────────────┐
                     │  /staff/manager        │
                     │  ManagerDashboard      │◄── same SSE stream
                     │                        │
                     │  Active Orders │ Avg   │
                     │  Revenue Today │ Queue │
                     │  ─────────────────────│
                     │  Sparkline chart       │
                     │  Out-of-stock alerts   │
                     └───────────────────────┘
```

---

## SSE Resilience (both journeys)

```
SSE connected ──► events flow ──► UI updates live

SSE drops
    │
    ├── retry 1 (1s backoff)
    ├── retry 2 (2s backoff)
    ├── retry 3 (4s backoff)
    │       reconnects with ?after={lastSeq} for server replay
    │
    └── 3 failures ──► isStale = true
                           │
                           ├── yellow "Live updates paused" banner
                           └── polling fallback every 10s
                                   │
                                   └── SSE reconnects ──► polling stops
```
