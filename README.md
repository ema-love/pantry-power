# Pantry Power

**Your pantry. Your stock. Always in control.**

A mobile-first web app for managing a household pantry: what you have, how much is left, what's running out, what's close to expiry, and what to buy on the next market trip. Built with Nigerian households in mind — bulk market restocks, and units like bags, cartons, tins, derica, mudu and paint buckets.

## Features

- **Dashboard** — greeting, today's date, counts for items / running low / out of stock / expiring soon, next market trip, recent activity, quick actions.
- **My Pantry** — searchable, filterable (category, stock status, expiring) and sortable list of item cards with one-tap **Use** / **Add** stock buttons.
- **Item details** — big stock figure, status, details, stock history, edit and delete (with confirmation and undo).
- **Stock management** — "I used some" / "I bought more" sheet with quick amounts, "Half" and "All of it", live preview of the new level. Stock can never go negative. Every change is recorded (addition, consumption, adjustment) and can be undone from the toast.
- **Low-stock monitoring** — status is computed automatically: *Out of stock* at 0, *Running low* at or below the minimum, *In stock* above it. One tap (or "Add all") puts items on the shopping list with a suggested quantity.
- **Expiry tracker** — Expired / within 7 days / within 30 days. Items without a date never show as expired; nothing is deleted automatically. Update the date or mark the item as thrown away.
- **Shopping list** — grouped by category, remaining count and progress, tick off bought items, "In the basket" section, clear bought items. Entries linked to pantry items can top up pantry stock in one tap ("Update pantry").
- **Market planner** — plan a trip, choose a date, attach shopping-list items, add a note, turn on a reminder, tick items off at the market, mark the trip done (optionally restocking the pantry), see completed trips.
- **Reminders** — always shown inside the app (day before and on the day). Browser notifications are requested only when you switch a reminder on.
- **Settings** — household name, preferred units, reminder preferences, export / import backup, load / remove demo data, delete all data.
- **Demo data** — realistic Nigerian pantry items, clearly marked **DEMO**, removable in one tap without touching your own items.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 3 · Lucide icons · Manrope (self-hosted via Fontsource) · Vitest.

No backend, no accounts, no environment variables.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (stock rules, expiry, validation, reducer, data recovery)
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build
```

`dist/` is a static site and can be hosted anywhere (Netlify, Vercel, GitHub Pages, any web server). Routing uses the URL hash, so no server configuration is needed.

## Project structure

```
src/
  types.ts                 Data model (PantryItem, Category, StockTransaction, ShoppingListItem, MarketTrip, …)
  lib/                     Pure logic: dates, units, categories, stock & expiry rules, validation,
                           sanitising stored/imported data, storage adapter, demo data, reminders, image downscaling
  state/
    reducer.ts             All state changes as pure actions
    selectors.ts           Derived views (stock status, expiry groups, trips, restockable entries)
    store.tsx              React context + persistence
    useActions.ts          User-level operations with feedback, confirmation and undo
    useReminderNotifier.ts Browser notifications for due trips
  components/
    ui/                    Button, Sheet (bottom sheet / dialog), Toast, Confirm, form fields, badges, …
    layout/                App shell (bottom nav on phones, sidebar on desktop), page header, logo
    pantry/ shopping/ market/   Feature components and forms
    AppSheets.tsx          Opens any form sheet from any screen
  pages/                   Dashboard, Pantry, Item detail, Alerts, Shopping, Market, Settings
```

## Data and persistence

- Everything is saved in the browser's local storage **on this device only**. It does **not** sync between devices.
- Stored and imported data is validated on load: damaged records are repaired or skipped, and an unreadable store is kept aside rather than overwritten.
- Use **Settings → Export backup** regularly and **Import backup** to restore or move to another device.
- Storage sits behind a `StorageAdapter` interface (`src/lib/storage.ts`), so a cloud-sync backend can be added later without changing the UI.

## Known limitations

- Local-only data: clearing browser data deletes the pantry unless a backup was exported.
- Browser notifications only appear while the app is open in a browser tab (there's no push server or service worker). The in-app reminder banner always works.
- Photos are downscaled to about 480 px to fit local storage. Hundreds of photos may still hit the browser's storage limit; the app will warn if a save fails.
- Restocking from the shopping list only happens when the list entry uses the same unit as the pantry item (e.g. both in kg).
- No offline install service worker yet; the app can be added to the home screen via the web manifest.
