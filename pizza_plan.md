# Pizza Store — Event-Driven CQRS/ES Architecture Assessment

> **Stack**: React frontend, Python backend, event-driven + event-sourced + CQRS
> **Assessed by**: UX Designer, Technical Architect, Devil's Advocate (agent team)

---

## Cross-Team Convergence

Both UX and Architecture independently chose **SSE over WebSockets** — strong signal that's the right call.

The devil's advocate's #1 practical concern is one the UX designer explicitly designed around: the **read-your-own-writes problem** after `POST /orders` returns 202. The UX plan uses optimistic updates to paper over it — but this needs explicit causality token plumbing on the backend to be reliable.

---

## Part 1: UX Plan

### Real-Time Transport
**SSE over WebSockets** — simpler, HTTP-native, auto-reconnects, one-directional. Commands go REST POST, reads come via SSE.

---

### Customer Flows

#### `MenuBrowseView`
- Category pills (Classic, Specialty, Build-Your-Own, Sides, Drinks) → `PizzaCardGrid`
- Sticky cart drawer (bottom-right) with item count + subtotal
- Menu cached in localStorage with 5-min TTL (stale-while-revalidate)
- "Popular" badge from a backend read model projection on order frequency

#### `CustomizePizzaSheet`
- Size → Crust → Sauce → Cheese → Toppings (with **half/whole toggle per topping**) → Special instructions
- `PizzaVisualizer` — SVG/canvas top-down pizza that updates live as toppings toggle
- **Optimistic "Add to Cart"** → item appears immediately, command fires in background, toast + rollback on failure

#### `CartView` (slide-in drawer)
- Edit reopens `CustomizePizzaSheet`
- Remove has a **3-second undo snackbar** before command fires
- Price recalculation is client-side using pricing rules baked into the menu payload

#### `CheckoutView`
- Delivery/Pickup toggle → address autocomplete or store selector → Stripe Elements + Apple/Google Pay
- On submit: button enters loading state immediately; SSE stream auto-transitions UI on `OrderPlaced`
- Payment failure: inline error, button re-enables, all form data preserved

#### `OrderTrackingView` ← most architecturally important
```
✓  Order Placed        2:14 PM
✓  Order Confirmed     2:15 PM
▶  Prep in Progress    2:17 PM  ← animated pulse
○  Out for Delivery
○  Delivered
```
- Timeline is **append-only** — never goes backward (matches event sourcing semantics)
- ETA shown as a **window** ("15–25 min"), never a countdown timer
- Per-item `PizzaStatusCard` driven by `ItemStatusUpdated` events
- `DriverTracker` map via separate `/sse/delivery/{orderId}` stream
- SSE reconnect: exponential backoff (1s → 2s → 4s → max 30s); fallback to 10s polling with "Live updates paused" indicator

---

### Staff / Kitchen Flows

#### `KitchenQueueView` — Kanban
Columns: `New | Confirmed | Prep | Baking | Ready | Dispatched`

Each `OrderTicket`:
- Large order number (readable at distance)
- Time elapsed → **amber at 15 min, red at 25 min**
- One-tap advance button ("Start Prep", "Oven In", "Ready"...)
- New orders: slide-in animation + **sound alert** + full-screen flash if screen idle
- Staff never drag cards — only the advance button moves them (prevents accidental reordering)

#### `ManagerDashboardView`
Live widgets all subscribing to `/sse/operations`:
- Active orders by status, avg prep time (30-min rolling window), revenue today, queue depth sparkline, out-of-stock alerts

---

### State Management (4 Layers)

| Layer | Tool | Purpose |
|---|---|---|
| Server state | React Query | Menu, order snapshots, initial fetches |
| Event stream state | `useOrderEventStream` + `useReducer` | Live SSE events → `OrderViewModel` |
| UI state | useState / Zustand | Cart, sheets, filters |
| Optimistic state | React Query `onMutate` + `onError` | Inline at mutation site, rollback on failure |

The reducer is a **pure function over events** — easy to test, easy to replay for debugging.

```typescript
type OrderEvent =
  | { type: 'OrderPlaced'; payload: OrderPlacedPayload }
  | { type: 'OrderConfirmed'; payload: OrderConfirmedPayload }
  | { type: 'PrepStarted'; payload: PrepStartedPayload }
  | { type: 'OrderCancelled'; payload: { reason: string } }

function orderReducer(state: OrderViewModel, event: OrderEvent): OrderViewModel
```

---

### Component Tree

```
App
├── CustomerApp
│   ├── MenuBrowseView
│   │   ├── CategoryPillBar
│   │   ├── PizzaCardGrid → PizzaCard
│   │   └── CartDrawerHandle
│   ├── CustomizePizzaSheet
│   │   ├── SizeSelector, CrustSelector, ToppingGrid
│   │   ├── ToppingChip (with half/whole toggle)
│   │   └── PizzaVisualizer
│   ├── CartView (drawer) → CartLineItem
│   ├── CheckoutView
│   │   ├── FulfillmentToggle, AddressAutocomplete
│   │   └── StripePaymentElement
│   └── OrderTrackingView
│       ├── OrderStatusTimeline
│       ├── EstimatedTimeWidget
│       ├── PizzaStatusCard (per item)
│       └── DriverTracker
└── StaffApp
    ├── KitchenQueueView
    │   ├── OrderLane (per status) → OrderTicket
    │   └── NewOrderAlert
    ├── OrderDetailSheet → OrderEventLog
    └── ManagerDashboardView
        ├── ActiveOrdersCounter, AveragePrepTime
        ├── QueueDepthChart, OutOfStockAlerts
```

---

### Key UX Decisions
1. SSE not WebSockets
2. No Redux — React Query + useReducer + Zustand
3. Optimistic updates everywhere on the customer side
4. Kanban for kitchen (spatial memory beats lists)
5. Event log visible to staff (it's already there — expose it as a trust/debug tool)
6. No countdown timers — time windows only
7. Sound alerts for kitchen (touchscreens don't get babysit)
8. Separate SSE streams per concern with clean auth boundaries

---

## Part 2: Technical Architecture

### Event Store: PostgreSQL (append-only)

No new infrastructure — PostgreSQL `LISTEN/NOTIFY` handles fan-out for free. EventStoreDB is excellent but adds operational complexity; Kafka is overkill under ~10k orders/day.

```sql
CREATE TABLE events (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id     TEXT        NOT NULL,          -- "order-{order_id}"
    stream_type   TEXT        NOT NULL,          -- "Order"
    event_type    TEXT        NOT NULL,          -- "OrderPlaced"
    event_version INT         NOT NULL,          -- monotonic per stream
    payload       JSONB       NOT NULL,
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (stream_id, event_version)             -- optimistic concurrency guard
);

CREATE INDEX idx_events_stream_id ON events (stream_id, event_version);
CREATE INDEX idx_events_occurred_at ON events (occurred_at);
```

---

### CQRS Split

#### Commands

| Command | Handler | Aggregate |
|---|---|---|
| `PlaceOrder` | `PlaceOrderHandler` | `Order` |
| `AcceptOrder` | `AcceptOrderHandler` | `Order` |
| `RejectOrder` | `RejectOrderHandler` | `Order` |
| `StartPreparation` | `StartPreparationHandler` | `Order` |
| `MarkPizzaReady` | `MarkPizzaReadyHandler` | `Order` |
| `AssignDriver` | `AssignDriverHandler` | `Order` |
| `MarkDelivered` | `MarkDeliveredHandler` | `Order` |
| `MarkFailed` | `MarkFailedHandler` | `Order` |

Command flow:
```
HTTP POST /orders
  → CommandBus → PlaceOrderHandler
    → loads Order aggregate (replay events from store)
    → order.place_order(...)
    → aggregate emits [OrderPlaced]
    → EventStore.append(stream_id, events, expected_version)
    → pg_notify('domain_events', ...)
```

#### Projections (Query Side)

| Projection | Table | Updated By |
|---|---|---|
| `OrderSummaryProjection` | `read_order_summary` | All Order events |
| `ActiveOrdersProjection` | `read_active_orders` | Subset of Order events |
| `KitchenQueueProjection` | `read_kitchen_queue` | `OrderAccepted`, `StartPreparation`, `MarkPizzaReady` |
| `MenuProjection` | `read_menu_items` | All Menu events |
| `DriverDashboardProjection` | `read_driver_assignments` | `AssignDriver`, `MarkDelivered` |

---

### Event Schema

All events share a common envelope:

```python
class DomainEvent(BaseModel):
    event_id: UUID
    event_type: str
    stream_id: str        # "order-{order_id}"
    stream_type: str      # "Order"
    occurred_at: datetime
    version: int
    payload: dict
```

Key event payloads:

**OrderPlaced**
```json
{
  "event_type": "OrderPlaced",
  "version": 1,
  "payload": {
    "order_id": "01942c3e-...",
    "customer_id": "cust-abc123",
    "delivery_address": { "street": "123 Main St", "city": "Springfield", "zip": "12345" },
    "items": [
      { "item_id": "pizza-margherita", "name": "Margherita", "quantity": 2, "unit_price": 12.99 }
    ],
    "total_price": 28.47
  }
}
```

**OrderAccepted** — adds `accepted_by`, `estimated_prep_minutes`
**PizzaPreparing** — adds `kitchen_station`, `prep_started_at`
**PizzaReady** — adds `ready_at`
**OrderDelivered** — adds `driver_id`, `delivered_at`, `delivery_duration_minutes`
**OrderFailed** — adds `reason`, `failed_at`, `refund_eligible`

---

### Python Backend Structure (FastAPI + asyncpg)

```
pizza_store/
├── domain/                      # Pure domain logic — NO infrastructure imports
│   ├── aggregates/
│   │   ├── base.py              # Aggregate base class
│   │   ├── order.py             # Order aggregate
│   │   └── menu.py
│   ├── commands/
│   │   └── order_commands.py    # PlaceOrder, AcceptOrder, etc. (Pydantic models)
│   ├── events/
│   │   ├── base.py              # DomainEvent base model
│   │   └── order_events.py      # OrderPlaced, OrderAccepted, etc.
│   ├── value_objects/
│   │   ├── address.py
│   │   ├── money.py
│   │   └── order_item.py
│   └── exceptions.py
│
├── application/                 # Use cases / command handlers
│   ├── command_bus.py
│   ├── handlers/
│   │   ├── place_order.py
│   │   ├── accept_order.py
│   │   ├── start_preparation.py
│   │   └── mark_delivered.py
│   └── projectors/
│       ├── order_summary.py
│       ├── kitchen_queue.py
│       └── driver_dashboard.py
│
├── infrastructure/              # DB, messaging, external services
│   ├── event_store/
│   │   └── postgres_event_store.py
│   ├── event_bus/
│   │   └── postgres_event_bus.py  # NOTIFY/LISTEN
│   └── repositories/
│       └── order_repository.py
│
├── api/                         # FastAPI HTTP layer (thin)
│   ├── main.py
│   ├── routers/
│   │   ├── orders.py            # POST /orders, GET /orders/{id}/stream (SSE)
│   │   ├── kitchen.py
│   │   └── menu.py
│   └── schemas/                 # Request/response models (not domain events)
│
└── projector_worker/            # Separate process: LISTEN → project
    └── worker.py
```

---

### End-to-End Flow: "Customer Places Order"

```
CUSTOMER BROWSER
  POST /api/orders
  EventSource("/api/orders/{id}/stream") ← open before navigating away
        │
        ▼
FastAPI router → validates request → builds PlaceOrder command
        │
        ▼
PlaceOrderHandler
  order = Order()
  order.place_order(customer_id, items, address)
    → Order._apply(OrderPlaced(...))
      - mutates aggregate state (status → PENDING)
      - appends to _pending_events
        │
        ▼
PostgresEventStore.append()
  BEGIN TRANSACTION
    INSERT INTO events (stream_id, event_type, payload, version=1)
    SELECT pg_notify('domain_events', '{"event_type":"OrderPlaced",...}')
  COMMIT
        │
        ├── HTTP 201 → { order_id, status: "pending" } → browser
        │
        └── NOTIFY fires two async listeners in parallel:

    Projector Worker                    SSE Endpoint
    ────────────────                    ───────────────────────────
    LISTEN 'domain_events'              LISTEN 'domain_events'
    → OrderSummaryProjection            → filter by order_id
      UPDATE read_order_summary         → yield SSE frame to browser
    → ActiveOrdersProjection            → React onmessage() fires
      INSERT read_active_orders         → UI updates status live
```

---

### Key Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Event store | PostgreSQL append-only | Operational simplicity; LISTEN/NOTIFY for free fan-out |
| Framework | FastAPI + asyncpg | Async-native; essential for SSE and concurrent projectors |
| Aggregate loading | Full event replay | Simple; snapshots addable later if stream length grows |
| Real-time | SSE | Unidirectional, HTTP-native, auto-reconnects |
| Projector execution | Separate worker process | Isolates read model failures from command path |
| IDs | UUID v7 | Sortable by time; works as global event ordering tiebreaker |
| Concurrency guard | `UNIQUE(stream_id, version)` | Cheap optimistic locking; retry on `UniqueViolationError` |

---

## Part 3: Devil's Advocate Critique

### Is This Overkill?

**The justification test** — need YES to 3+ to earn CQRS/ES:

| Question | Likely Answer |
|---|---|
| Regulatory audit history required? | No |
| >5 bounded contexts with conflicting models? | No |
| Extreme read/write asymmetry requiring independent scaling? | Maybe at scale |
| Multiple downstream consumers of the same events? | Possibly |
| Temporal queries ("state at 7:43pm") a real requirement? | Rarely |
| >10 engineers needing independent read/write work? | Unlikely |

**Verdict**: For a single-location pizza store, this is a graduate thesis cosplaying as a product. For a multi-tenant SaaS platform for hundreds of stores, the math changes.

---

### Risk Matrix

| Risk | Severity | Likelihood | When It Hits |
|---|---|---|---|
| Schema evolution breaks projections | **HIGH** | Certain | Month 3–6 |
| Eventual consistency → duplicate orders | **HIGH** | High | Week 1 in prod |
| Projection rebuild takes down kitchen display | **HIGH** | High | First bug fix after launch |
| WebSocket/SSE drop → stale/inconsistent UI | **HIGH** | High | Day 1 with mobile users |
| Async event handler silently drops events | **HIGH** | Medium | First production load spike |
| Consumer lag grows under Friday night rush | MEDIUM | Medium | First busy service |
| Duplicate commands from network retry | MEDIUM | High | Week 1 |
| Out-of-order events crash UI state machine | MEDIUM | Medium | First concurrent update |
| Projection/command pool contention | MEDIUM | Low | Under stress |
| Event store growth slows replay over time | LOW | Certain | Year 1–2 |

---

### Specific Failure Scenarios

**Schema Evolution** — nobody talks about this until month 6. You ship `OrderPlaced_v1` with `"toppings": ["pepperoni"]`. Later you need quantities: `"toppings": [{"name": "pepperoni", "quantity": 2}]`. Every historical projection breaks. You need upcasters — version-aware migration functions — which nobody writes until the fire is already burning.

**Eventual Consistency UI** — customer submits order, POST returns 202, customer immediately refreshes, order isn't there yet, customer clicks Submit again. Two orders. Customer calls the store furious. This is not hypothetical.

**Projection Rebuild** — a bug in `KitchenQueueProjection` runs for 3 days and corrupts data. You fix it. Replay all events. Kitchen display shows nothing for 40 minutes during lunch rush. Staff uses paper.

**Python Async Handler Failure** — exception raised inside `gather()`. Either all other tasks are cancelled silently, or the exception is swallowed into a result. Either way, events vanish. You debug at 2am.

---

### Non-Negotiables If You Proceed

| Non-Negotiable | Why It Breaks Without It |
|---|---|
| Event versioning from day one (`schema_version` field) | Schema changes corrupt historical projections |
| Idempotent commands (client UUID + server dedup table) | Network retries create duplicate orders |
| Dead letter queue for failed event handlers | Silent event loss under production errors |
| Read-your-own-writes guarantee (causality token) | Double-submit on order confirmation |
| Consumer lag monitoring (alert at >5 seconds) | Kitchen display silently falls behind |
| Blue/green projection rebuilding | Bug fix requires taking kitchen display offline |
| Sequence numbers on SSE + client tracking + server replay | Stale UI after connection drop |
| Async DLQ in Python (try/catch around every handler) | Events vanish silently on exception |

---

### The Simpler Alternative

**FastAPI + PostgreSQL + React Query + SSE** with an append-only `order_events` audit table (50 lines of code):
- Gets 80% of event sourcing benefits
- A new engineer understands it in 2 hours, not 2 weeks
- Debug with `SELECT * FROM orders WHERE id = X`
- Migrate with `ALTER TABLE`, not upcasters
- **Time to first working order flow**: 2 days vs 2–3 weeks

> *"Architecture should earn its complexity through demonstrated need, not be assumed upfront."*

---

## Decision Checklist

Before committing to full CQRS/ES, confirm:

- [ ] Is this a multi-tenant platform (multiple stores), or a single store?
- [ ] Is regulatory audit history a hard requirement?
- [ ] Do you have multiple independent downstream consumers (kitchen display, delivery app, analytics)?
- [ ] Do you have engineers who have shipped event-sourced systems before?
- [ ] Have you budgeted for the 8 non-negotiables listed above?

If fewer than 3 boxes are checked, start with the boring stack and add complexity when a concrete requirement forces your hand.
