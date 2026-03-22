# UX Review — Parallel Frontend Implementation

Review of existing patterns and actionable recommendations for each agent.

---

## Design System Summary (existing patterns)

- **Icon library**: `lucide-react` (v0.577) — use exclusively, no other icon packages
- **Color palette**: Customer app uses `bg-gray-50` base, `red-600` primary (buttons, accents), `gray-200` borders, `gray-900` text. Staff app uses dark theme: `bg-gray-900` base, `gray-800` cards, `gray-300`/`gray-400` text
- **Border radius**: Cards use `rounded-xl` (12px), buttons use `rounded-lg` (8px), pills use `rounded-full`
- **Spacing**: Consistent `gap-2`/`gap-3`/`gap-4`, padding `p-4`, section margins `mb-6`
- **Typography**: Headings `text-xl font-bold`, section titles `font-semibold`, body `text-sm`, meta `text-xs`
- **Active/selected state**: `bg-red-600 text-white border-red-600` (see category pills in MenuBrowseView, fulfillment toggle in CheckoutView)
- **Overlay pattern**: CartDrawer uses `fixed inset-0 bg-black/40 z-50` backdrop, `fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-xl` panel
- **Tailwind v4**: Uses `@import "tailwindcss"` — no tailwind.config file. Custom properties are in `index.css` `:root`

---

## Agent 1 — CustomizePizzaSheet

### Sheet open/close animation

The existing CartDrawer does **not** animate — it conditionally renders with `if (!isOpen) return null`. For the CustomizePizzaSheet, match this simplicity first, but improve both sheets later if time permits. Recommended pattern:

- **Bottom sheet** (not side drawer — differentiate from CartDrawer and better for mobile customization flows)
- Use `fixed inset-x-0 bottom-0 z-50` with `max-h-[85vh]` so the header stays visible
- Backdrop: reuse `fixed inset-0 bg-black/40 z-50` (same as CartDrawer)
- Add CSS transition: `translate-y-full -> translate-y-0` with `transition-transform duration-300 ease-out`
- Close on Escape (CartDrawer already does this — copy the `useEffect` pattern from `CartDrawer.tsx:19-26`)
- Lock body scroll while open (copy pattern from `CartDrawer.tsx:29-32`)

### Topping selector: chip layout

- Use a horizontal-wrap flex container: `flex flex-wrap gap-2`
- Group by category with a `text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1` label above each group
- Each chip: `px-3 py-1.5 rounded-full text-sm border transition-colors` — matches the existing category pill pattern in MenuBrowseView
- **Inactive**: `bg-white text-gray-700 border-gray-300`
- **Active**: `bg-red-600 text-white border-red-600`
- Spacing between groups: `mb-4`

### HalfWholeToggle: visual treatment for 3 states

Recommended: a segmented control with 3 segments (Left Half | Whole | Right Half).

- Container: `inline-flex rounded-lg border border-gray-300 overflow-hidden`
- Each segment: `px-3 py-1.5 text-xs font-medium`
- Selected segment: `bg-red-600 text-white`
- Unselected: `bg-white text-gray-600 hover:bg-gray-50`
- Use half-circle icons from lucide or simple SVG semicircles for Left/Right to make it instantly scannable
- Only show the toggle when a topping is selected (avoid visual clutter for unselected toppings)

### PizzaVisualizer

- **Size**: 200x200px SVG centered above the topping selector, wrapped in `mx-auto mb-4`
- **Crust ring**: `stroke="#D97706"` (amber-600) `strokeWidth="12"` circle at r=90
- **Sauce fill**: `fill="#DC2626"` (red-600) circle at r=84
- **Cheese base**: `fill="#FDE68A"` (amber-200) circle at r=84, rendered on top of sauce
- **Topping dots**: 6-10px circles per topping, colors by category:
  - Meat: `#991B1B` (red-800) — pepperoni, sausage
  - Veggie: `#15803D` (green-700) — peppers, olives, onion
  - Cheese: `#F59E0B` (amber-500) — extra cheese, parmesan
  - Sauce: `#DC2626` (red-600) — extra sauce indicators
- Half-topping clip paths: use `clipPath` with a rect covering left or right half of the circle

### Accessibility

- **Focus trap**: When sheet opens, trap focus within the sheet. Use a simple approach: on open, focus the first interactive element; on Tab from last element, wrap to first
- **aria-modal="true"** and **role="dialog"** on the sheet container
- **aria-label** on close button: `aria-label="Close customization"`
- Topping chips should be `role="checkbox"` with `aria-checked`
- HalfWholeToggle: use `role="radiogroup"` with `role="radio"` per segment

---

## Agent 2 — Staff App

### OrderTicket: information hierarchy

Current skeleton in KitchenQueueView is solid. Recommendations for the extracted component:

1. **Order number** — largest, boldest (`text-lg font-bold`, already correct)
2. **Elapsed time badge** — top-right, color-coded (already implemented)
3. **Item list** — `text-sm text-gray-300` (already correct)
4. **Advance button** — full width at bottom of card, `w-full py-2 text-sm font-semibold rounded-lg`
   - Use status-appropriate colors: `bg-blue-600 hover:bg-blue-700` for "Confirm", `bg-amber-600` for "Start Prep", `bg-orange-600` for "Oven In", `bg-green-600` for "Ready", `bg-indigo-600` for "Dispatch"
   - This prevents accidental taps — the color shift signals a state change

### TimerBadge: thresholds and visual treatment

The existing `ElapsedBadge` in KitchenQueueView already has the right thresholds:
- **< 15 min**: `text-gray-400` (normal)
- **>= 15 min**: `text-amber-400` (warning)
- **>= 25 min**: `text-red-400` (critical)

Enhancement for the extracted `TimerBadge`:
- At >= 25 min, add `animate-pulse` to draw urgent attention
- Consider adding a subtle background: `bg-red-900/30 px-1.5 rounded` at critical threshold
- The badge must use `setInterval(1000)` with cleanup — the existing implementation uses a one-shot `Math.floor` calculation which won't live-update

### KanbanBoard: column width and overflow

- Current: `shrink-0 w-52` per column — this is good for 6 columns on desktop
- Add `min-h-[calc(100vh-8rem)]` to columns so they fill vertical space
- **Overflow**: When a column has many orders (e.g., 10+ pending during rush), the page will scroll vertically. Instead, make each column independently scrollable: `max-h-[calc(100vh-10rem)] overflow-y-auto`
- Add a sticky column header so the column label stays visible while scrolling: `sticky top-0 bg-gray-900 z-10 pb-2`
- On mobile (rare for staff, but safe): the `overflow-x-auto` on the parent already handles horizontal scroll

### "Enable Alerts" button: placement and discoverability

- Place in the KitchenQueueView header bar, right-aligned next to the connection indicator
- Use lucide `Bell` / `BellOff` icon
- Before enabling: `text-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-sm` with `BellOff` icon
- After enabling: `bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm` with `Bell` icon
- Label text: "Enable Alerts" / "Alerts On"
- Staff apps are typically used in noisy kitchens — the button should be prominent enough to find but not so large it wastes kanban space

### SparklineChart

- **Dimensions**: `width={120} height={32}` — fits inside the existing `MetricCard` component below the value
- **Stroke**: `stroke="#EF4444"` (red-500) with `strokeWidth="1.5"` and `fill="none"`
- **Fill area**: Add a gradient fill below the line: `fill="url(#sparkGradient)"` from `red-500` at 20% opacity to transparent
- **No axes, no labels** — the plan already specifies this, which is correct
- Use `strokeLinejoin="round"` and `strokeLinecap="round"` for a polished look

---

## Agent 3 — OrderTrackingView

### StatusTimeline: animation timing

- **Duration**: `300ms` for the slide-in — fast enough to feel responsive, slow enough to notice
- **Easing**: `ease-out` (CSS `cubic-bezier(0, 0, 0.2, 1)`)
- **Keyframes**:
  ```css
  @keyframes timeline-enter {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  ```
- Apply via `animation: timeline-enter 300ms ease-out` on newly appended items
- Use a key based on the status so React triggers the animation on new entries only
- Completed steps should use `CheckCircle2` with `text-green-500` (already the pattern)
- Active step: keep the `Loader2 animate-spin text-red-600` spinner (matches existing)

### ETAWindow: typography and placement

- Current placement is good: above the timeline in a `bg-red-50` card
- Keep "Estimated arrival" as `text-sm text-red-600 font-medium`
- Time range `text-2xl font-bold text-red-700` — this is correct and high-contrast
- **Enhancement**: Add a subtle clock icon from lucide (`Clock`) to the left of "Estimated arrival" for instant scannability
- The `getETAWindow` function is well-implemented — extract it as-is

### DriverTrackerMap

- **Height**: `h-64` (256px) on mobile, `h-80` (320px) on `sm:` breakpoint — enough to show context without dominating the view
- **Tile provider**: OpenStreetMap default tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) — free, no API key needed
- **Container**: `rounded-xl overflow-hidden border border-gray-200 mb-6` to match the card pattern
- **Zoom level**: Start at `z=15` (neighborhood level) centered on driver location
- **Driver marker**: Use a custom div icon with a colored dot (`bg-red-600 w-3 h-3 rounded-full`) plus a pulsing ring (`animate-ping`) for visibility
- **Restaurant marker**: Static pin at order origin
- Only render when `fulfillmentType === 'delivery'` (plan already specifies this)
- Add `attribution` for OSM compliance

### PizzaStatusCard: layout

- Keep the existing layout pattern from OrderTrackingView lines 114-125 but enhance:
- Each card: `bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3`
- Left side: small pizza icon or colored dot indicating item status
- Center: `item.name` as `text-sm font-medium`, `item.status` as `text-xs text-gray-500 capitalize`
- Right side: if `kitchenStation` is available, show as a subtle badge: `text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full`
- Status colors for the dot:
  - pending/confirmed: `bg-gray-300`
  - preparing: `bg-amber-400`
  - baking: `bg-orange-500`
  - ready: `bg-green-500`

---

## Agent 4 — E2E

### Top 3 highest-risk user flows to prioritize

1. **Customer ordering happy path** (browse -> customize -> add to cart -> checkout -> tracking): This is the core revenue flow. If any step breaks, the business stops. Highest priority. Cover both quick-add and customize paths.

2. **Kitchen order advancement** (order appears in pending -> staff advances through all statuses): This is the operational backbone. SSE-driven state changes must flow correctly from placement through completion. Test that the kanban board reflects status changes and that the advance button label changes correctly.

3. **SSE resilience / reconnection**: The `liveUpdatesPaused` banner and reconnection logic protect the real-time experience. If SSE drops silently, both customers and staff see stale data. Simulate connection drops and verify the banner appears and data recovers.

### Edge cases for SSE resilience test

- **Rapid reconnect**: Drop and restore connection within 1 second — verify no duplicate events render
- **Stale banner timing**: After aborting the SSE route, assert the yellow banner appears within the reconnection timeout (not immediately — the hook likely has a delay/retry)
- **Recovery after extended drop**: Abort SSE, wait 5+ seconds, restore — verify the view recovers and shows current state (not a stale snapshot)
- **Multiple SSE streams**: If both order tracking and operations streams are active (unlikely in same view, but worth considering), verify independent resilience
- **Tab visibility**: If the browser tab is backgrounded during an SSE drop, verify reconnection happens when the tab regains focus (if the app uses `visibilitychange` listeners)

---

## Cross-cutting Recommendations

1. **z-index layering**: CartDrawer uses `z-50`. CustomizePizzaSheet should also use `z-50` — they are mutually exclusive (you can't customize while the cart is open). Do NOT go higher than `z-50` for overlays; the sticky header is `z-40`.

2. **Consistent transition timing**: Use `transition-colors` (150ms default) for hover states everywhere. Use `duration-300 ease-out` for sheet/panel open/close. This is already implicit in the existing code.

3. **Mobile-first**: The customer app is `max-w-5xl` centered. The customize sheet, tracking view, and checkout are all `max-w-lg` — maintain this. Staff app is full-width which is correct for kitchen displays.
