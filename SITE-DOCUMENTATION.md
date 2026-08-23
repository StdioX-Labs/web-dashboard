# SoldOutAfrica Web Dashboard — Site Documentation

Page-by-page reference for the organizer dashboard: what each page is for, which APIs it
calls, and what data it renders.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · framer-motion · sonner (toasts) · lucide-react
- **Upstream API:** `https://api.soldoutafrica.com/api/v1`
- **Deployment:** Coolify, behind Cloudflare. Answers on both `organiser.soldoutafrica.com` and `dashboard.soldoutafrica.com`; `organiser.` is the one the marketplace links and the one ad landing URLs use.
- **Analytics:** Mixpanel, initialised in `app/layout.tsx` with autocapture + session recording

---

## 1. Architecture at a glance

### Request path

Browser components never call the upstream API directly. Every call goes:

```
component → lib/api-client.ts (api.*) → /api/... Next route handler → api.soldoutafrica.com
```

`lib/api-client.ts` sets `USE_PROXY = true`, so `apiRequest()` prefixes every endpoint with
`/api`. The route handlers under `app/api/**` attach HTTP Basic credentials
(`SOLDOUT_API_USERNAME` / `SOLDOUT_API_PASSWORD`) server-side, so upstream credentials are
never shipped to the browser.

### Session & auth

| Concern | Implementation |
| --- | --- |
| Session store | `lib/session-manager.ts` → `localStorage` key `user_session`, 24h TTL |
| Session shape | `phoneNumber, role, is_active, kycStatus, profile_type, company_id, user_id, company_name, currency, email` |
| Route guard | `lib/hooks/use-auth.ts` (`useAuth`) used by `app/dashboard/layout.tsx`; redirects to `/` when there is no valid session |
| Login flow | Email → OTP. The OTP and user record stay server-side (`lib/pending-login-store.ts`); the client only holds an opaque `loginToken` |
| Deactivated accounts | `/api/auth/verify-otp` returns **403** and withholds the user object when `is_active === false`, so no session can be minted even with a valid code. Checked at verification rather than at code request, so account status is only revealed to whoever received the code. `sessionManager.getSession()` also discards any stored session whose user is inactive |
| Rate limiting | `lib/rate-limiter.ts`, IP-based, default 3 requests / 5 min, 15 min block, applied to `/api/auth/login` and `/api/auth/verify-otp` |

`authToken` in `localStorage` is a local marker (`session_<userId>_<ts>`), not an upstream
bearer token — real authentication happens with Basic auth inside the route handlers.

### Caching

`lib/event-cache.ts` is an in-memory singleton with a 5-minute TTL, request de-duplication
(so parallel components share one in-flight fetch), and XOR+base64 obfuscation of the cached
payload keyed on `companyId`. Used by the Events list and the Event Detail page under the
key `all-events-300`.

### Multi-tenancy

`/api/admin/events/all` can return events beyond the caller's company, so every consumer
re-filters client-side on `event.companyId === user.company_id`.

### Feature flags (compile-time constants)

| Flag | File | Default | Effect |
| --- | --- | --- | --- |
| `ENABLE_DISCOVER` | `components/side-nav.tsx` | `false` | Hides Discover from the sidebar |
| `ENABLE_PROMOTIONS` | `components/side-nav.tsx` | `false` | Hides Promotions from the sidebar |
| `ENABLE_PROMOTIONS` | `components/dashboard-home.tsx` | `false` | Hides the Promotions quick action |
| `ENABLE_AFFILIATES` | `components/users-page.tsx` | `false` | Hides the Affiliates tab |

Flagged-off pages still resolve if you navigate to the URL directly.

---

## 2. Page-by-page

### `/` — Login

**File:** `app/page.tsx` → `components/login-page.tsx`

**Purpose.** Entry point. Redirects to `/dashboard` if a valid session already exists,
otherwise shows the email + OTP sign-in. The "Sign Up" tab routes to `/signup`.

**APIs**

| Action | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Request / resend OTP | `api.auth.requestOtp(email, 'email')` | `POST /api/auth/login` | `POST /user/otp/login` |
| Verify OTP | `api.auth.verifyOtp(loginToken, otp)` | `POST /api/auth/verify-otp` | (validated against the server-side pending-login store) |

Deactivated accounts (`is_active: false`) are rejected at verification with a 403 and an
"account has been deactivated" toast — a correct OTP does not get them in.

**Data displayed.** Branding panel with static marketing stats (Events 100+, Tickets 100K+,
Rating 99%); email field with client-side validation; 4-digit OTP field with resend / change
email; toasts for success, failure, and 429 rate-limit responses (with retry-after minutes).

**On success.** `sessionManager.createSession(response.user)` then redirect to `/dashboard`.

---

### `/signup` — Organizer registration

**File:** `app/signup/page.tsx` → `components/signup-page.tsx`

**Purpose.** Three-step self-registration: personal details → company details → success.

**APIs (ordered — company first, its `id` feeds the user)**

| Step | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| 1 | `api.company.create(...)` | `POST /api/company/create` | `POST /company/create` |
| 2 | `api.user.create(...)` | `POST /api/user/create` | `POST /user/create` |

**Data collected.** Step 1: full name, ID number, mobile, email, password (min 8, confirmed).
Step 2: company name, phone, email, physical/postal address, currency (KES/USD/EUR/GBP).
Phone numbers are normalised to `254XXXXXXXXX`. The company is created with
`profileType: "EVENT_ORGANIZER"`, `billingAccountType: "MPESA"`; the user with
`roles: "COMPANY_OWNER"`.

**On success.** Creates a session and redirects to `/dashboard` after ~2s.

---

### `/dashboard` — Home

**File:** `app/dashboard/page.tsx` → `components/dashboard-home.tsx`

**Purpose.** Financial and activity overview for the signed-in company.

**APIs** — three independent staged fetches so the hero renders before the rest:

| Stage | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| 1 | `api.company.getSummary(companyId)` | `GET /api/company/summary` | `GET /company/summary?companyId=` |
| 2 | `api.company.getAllEvents(companyId, 0, 300)` | `GET /api/admin/events/all` | `GET /admin/events/get/all` |
| 3 | `api.transactions.fetchDetailed({ idType: 'company', size: 5 })` | `POST /api/transactions/detailed` | `POST /gl/transactions/fetch/detailed` |

**Data displayed**

- **Revenue hero (gradient card):** Total Revenue, Commission & Fees, Withdrawn (hard-coded 0),
  Available Balance (`revenue − fees − withdrawn`), with an eye toggle to mask amounts, plus
  non-functional Withdraw / Report buttons.
- **Stat tiles:** Total Events, Active Events, Tickets Sold, Total Revenue (in `K`).
- **Quick Actions:** Create Event, View Events, Transactions (Promotions is flag-gated off).
- **Upcoming Events:** next 5 active events starting after now — name, start date+time,
  location, computed revenue and ticket count.
- **Recent Transactions:** latest 5 — event + ticket name, date, buyer name, amount, status badge.

**Note.** Revenue and fees prefer the sum of `totalRevenue` / `totalPlatformFee` across the
events response and fall back to the summary endpoint.

---

### `/dashboard/events` — Events list

**File:** `app/dashboard/events/page.tsx` → `components/events-page.tsx`

**Purpose.** Browse, search, and filter the company's events.

**APIs.** `api.company.getAllEvents(companyId, 0, 300)` → `GET /api/admin/events/all` →
`GET /admin/events/get/all`, wrapped in `eventCache` (key `all-events-300`).

**Data displayed.** Per event card: poster, name, description, status badge, start date,
`ticketsSold / totalTickets`, revenue, location, and View / Edit links.

**Status derivation** (`getEventStatus`): API `status === 'ONHOLD'` → *Pending Approval*;
else `!isActive` → *Inactive*; end date past → *Past*; start date future → *Upcoming*;
otherwise *Active*. Filter chips: All · Active · Upcoming · Pending · Past · Inactive.
Search matches name, description, and location. Sorted newest start date first.

---

### `/dashboard/events/create` — Create event

**File:** `app/dashboard/events/create/page.tsx` → `components/create-event-page.tsx`

**Purpose.** Two-step wizard: create the event, then attach ticket types.

**APIs**

| Step | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Poster upload | `uploadToContabo(file)` | `POST /api/upload-image` | Contabo S3 (`eu2.contabostorage.com`) via `@aws-sdk/client-s3` |
| Create event | `api.company.createEvent(...)` | `POST /api/event/create` | `POST /event/create` |
| Create ticket (looped per type) | `api.company.createTicket(...)` | `POST /api/event/ticket/create` | `POST /event/ticket/create` |

**Step 1 fields.** Name, auto-generated URL slug (`a-z0-9-`, previewed as
`soldoutafrica.com/<slug>`), category (19 options mapped to numeric ids), **event start
date & time**, **event end date & time**, currency (KES/USD), venue, description,
**ticket sales start / end date & time**, poster upload (validated type/size, ≤10MB).

**Step 2 fields (per ticket type).** Name, price, quantity, complementary count, group-ticket
toggle (`ticketsToIssue`), restrict-per-person toggle (`ticketLimitPerPerson`), optional
description, and optional per-ticket sale window that overrides the event window.

**Validation.** Required text fields; slug format; **each date field requires both a day and a
time**; event end must be after event start; sales end must be after sales start; poster
required; at least one complete ticket type. All datetimes are sent as ISO strings.

**Step 3.** Success panel, then redirect to `/dashboard/events`.

---

### `/dashboard/events/[id]` — Event detail

**File:** `app/dashboard/events/[id]/page.tsx` → `components/event-detail-page.tsx`
(a modular rewrite exists under `components/event-detail/` but is not the mounted route)

**Purpose.** The operational hub for a single event: performance, ticket administration,
transactions, attendees, reporting, and suspend/activate controls.

**APIs**

| Purpose | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Event summary/analytics | `api.company.getAllEvents(companyId, 0, 300)` | `GET /api/admin/events/all` | `GET /admin/events/get/all` |
| Full event + tickets | `api.event.getById(eventId)` | `GET /api/event/get` | `GET /event/get?eventId=` |
| Transactions | `api.transactions.fetchDetailed({ idType: 'event' })` | `POST /api/transactions/detailed` | `POST /gl/transactions/fetch/detailed` |
| Attendees | `api.company.getAttendees(eventId)` | `GET /api/gl/event/attendees/list` | `GET /gl/event/attendees/list?eventId=` |
| OTP for sensitive actions | `api.auth.requestOtp(phoneNumber, 'phone')` | `POST /api/auth/login` | `POST /user/otp/login` |
| Suspend / activate event | `api.event.toggleStatus(eventId, userId, { otp, eventStatus })` | `POST /api/event/status/toggle` | `POST /event/status/toggle` |
| Suspend / activate ticket | `api.ticket.toggleStatus(ticketId, userId, { otp, ticketStatus })` | `POST /api/ticket/status/toggle` | `POST /ticket/status/toggle` |
| Edit ticket | `api.ticket.update(ticketId, data)` | `POST /api/ticket/update` | `POST /ticket/update?ticketId=` |
| Add ticket type | `api.company.createTicket(...)` | `POST /api/event/ticket/create` | `POST /event/ticket/create` |
| Issue complimentary tickets | `api.company.issueComplementary(...)` | `POST /api/event/issue/complementary` | `POST /event/issue/complementary` |
| Affiliates on this event | `api.affiliates.getEventAffiliates(userId, eventId)` | `GET /api/affiliates/admin/event` | `GET /affiliates/admin/event` |
| Onboard an affiliate | `api.affiliates.onboard(...)` | `POST /api/affiliates/admin/onboard` | `POST /affiliates/admin/onboard` |
| Issue a link to an existing affiliate | `api.affiliates.linkToEvent(userId, affiliateId, eventId)` | `GET /api/affiliates/admin/link` | `GET /affiliates/admin/link` |
| Set revenue share / reactivate | `api.affiliates.adjustRevShare(affiliateId, revShare, isActive)` | `GET /api/affiliates/adjust/revshare` | `GET /affiliates/adjust/revshare` |
| Remove an affiliate | `api.affiliates.remove(userId, affiliateId, eventId?)` | `DELETE /api/affiliates/admin/remove` | `DELETE /affiliates/admin/remove` |

**Header.** Poster, name, status banners (pending-approval / sales-paused), Edit Event, View
Event (public link), Share, and a revenue strip: Total Revenue, Commission & Fees, Net Amount.

**Tabs**

| Tab | Contents |
| --- | --- |
| **Overview** | Event Information (date & time, location, category, tickets sold, total revenue, ticket types, available tickets) and Statistics |
| **Tickets** | Per ticket type: total issued, sold, comps issued, comps left, tickets left; purchase count shown alongside ticket count for group tickets; edit, suspend/activate, add ticket type |
| **Transactions** | Paginated event transactions — transaction id, buyer, ticket, amount, platform fee, date |
| **Attendees** | Attendee list — name, phone, email, ticket name/price, ticket id, group code, purchase time, scanned flag, complimentary flag, issued/scanned by |
| **Affiliates** | Affiliate management for this event (see below) |

**Affiliates tab.** Summary cards (affiliate count, checkouts, gross sales, commission), a
searchable table/card list, and four actions:

- **Add Affiliate** — name + mobile (any Kenyan format), rev-share model
  (`PERCENTAGE` / `FIXED_AMOUNT`), value, and a self-withdrawal toggle. The affiliate is
  active immediately, is texted their selling link, and signs in with an OTP — no password.
  Re-adding someone you already work with reuses them and just issues the event link.
- **Copy / open the selling link** — one event-wide link per affiliate; buyers pick whatever
  tickets they want and the sale is still attributed. "Issue link" appears when an affiliate
  has no live link for this event.
- **Adjust revenue share** — sends the affiliate's current `isActive` alongside the new value,
  since the endpoint sets both in one call.
- **Remove** — scoped to this event (disables its links only) or entirely (all links plus
  sign-in and self-withdrawal). Always a deactivation: past sales stay in the report and
  earned commission stays withdrawable, so deactivated affiliates still appear in the list
  with a *Reactivate* action.

Column meanings: **Checkouts** counts purchases, not tickets (one purchase of 3 tickets counts
once); **Commission** is everything earned (available + allocated + withdrawn); **Available**
is the withdrawable slice for this event only — the affiliate's cross-event balance lives at
`GET /fetch/balance`.

**Reporting.** `components/event-detail/ReportExporter.tsx` builds a self-contained HTML
report, stashes it in `sessionStorage` under `reportHTML`, and opens `/report` in a new tab.

**Sensitive actions** (suspend/activate an event or a ticket) require an OTP sent to the
signed-in user's phone.

---

### `/dashboard/events/[id]/edit` — Edit event

**File:** `app/dashboard/events/[id]/edit/page.tsx` → `components/edit-event-page.tsx`

**Purpose.** Update event details and existing ticket types.

**APIs**

| Purpose | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Load | `api.event.getById(eventId)` | `GET /api/event/get` | `GET /event/get?eventId=` |
| Save event | `api.event.update(eventId, data)` | `POST /api/event/update` | `POST /event/update?eventId=` |
| Save each ticket (parallel) | `api.ticket.update(ticketId, data)` | `POST /api/ticket/update` | `POST /ticket/update?ticketId=` |

**Data displayed / edited.** Name, category, event date & time, venue, description, ticket
sales window (bounded by the event date), poster preview, and per ticket: name, price,
quantity, complementary, group toggle, per-person limit, free flag, optional sale window.

**Known gaps.** `eventEndDate` is submitted as a copy of `eventStartDate` (no separate end
field on this form); the poster preview is local-only — this page does not re-upload images;
the category `<select>` uses slug values (`music`, `sports`, …) that do not match the numeric
category ids used on the create form.

---

### `/dashboard/scan` — Scan events (gate operations)

**File:** `app/dashboard/scan/page.tsx` → `components/scan-events-page.tsx`

**Purpose.** On-site gate tooling. Pick an event, then work in one of three modes.

**APIs**

| Purpose | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Event list | `api.company.getEvents()` | `GET /api/company/events` | `GET /company/events/get` |
| Event tickets | `api.event.getById(eventId)` | `GET /api/event/get` | `GET /event/get?eventId=` |
| Validate/redeem a barcode | `api.scanner.scan({ userId, eventId, barcode })` | `POST /api/scanner/scan` | `POST /scanner/scan` |
| Look up a group code | `api.scanner.getGroupTickets(code)` | `GET /api/ticket/group` | `GET /event/ticket/group/get?ticketGroup=` |
| Gate sale | `api.ticket.purchase(...)` | `POST /api/event/ticket/purchase` | `POST /event/ticket/purchase` |

**Modes**

| Mode | What it does |
| --- | --- |
| **M-Pesa** (default) | Sell at the gate: pick ticket type + quantity, enter customer phone, trigger an STK push |
| **QR Scan** | Live camera scanning via `html5-qrcode`; result modal shows success / already-scanned / error with ticket name, price, barcode, group code, customer mobile, complimentary flag |
| **Group Code** | Enter a group code, see all tickets in the group with poster/event/price, select which barcodes to redeem, redeem in bulk |

---

### `/dashboard/transactions` — All transactions

**File:** `app/dashboard/transactions/page.tsx` → `components/transactions-page.tsx`

**Purpose.** Company-wide ticket sale ledger.

**APIs.** `api.transactions.fetchDetailed({ id: companyId, idType: 'company', transactionType:
'TICKET_SALE', page, size: 10 })` → `POST /api/transactions/detailed` →
`POST /gl/transactions/fetch/detailed`.

**Data displayed.** Stat cards: Total Tickets Sold, Total Sales, Platform Liability (all from
the response `stats`), Total Transactions (from `pagination.totalElements`). Desktop table /
mobile cards: transaction id, event, customer, email, ticket type, qty (always 1 — one row per
ticket), amount, date, status. Server-side pagination (First/Prev/Next/Last); search and
status filter operate on the current page only.

---

### `/dashboard/users` — Users (& Affiliates)

**File:** `app/dashboard/users/page.tsx` → `components/users-page.tsx`

**Purpose.** Manage staff accounts for the company.

**APIs**

| Purpose | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| List users | `api.company.getUsers(companyId)` | `GET /api/company/users` | `GET /company/fetch/users?companyId=` |
| Create user | `api.user.create(...)` | `POST /api/user/create` | `POST /user/create` |
| Edit user | `api.user.edit(userId, requesterUserId, data)` | `PUT /api/user/edit` | `PUT /company/user/edit` |
| Suspend user | `api.user.void(userId, requesterUserId)` | `PUT /api/user/void` | `PUT /company/user/suspend` |

**Data displayed.** Counts (total / active / deactivated, and by role); a search box plus an
**All / Active / Deactivated** filter with live counts; and a user list showing full name,
email, mobile, role badge (`SUPER_ADMIN`, `COMPANY_OWNER`, `STAFF`), KYC status and an
Active/Deactivated badge. Deactivated rows carry a red border and a "cannot sign in until
reactivated" note. Add / edit / suspend modals; suspend calls `/user/void`, which toggles.

**Notes.** New users are created with a hard-coded default password. The **Affiliates** tab on
*this* page is behind `ENABLE_AFFILIATES = false` and is backed entirely by mock data — real
affiliate management lives on the Affiliates tab of an individual event.

---

### `/dashboard/profile` — Profile

**File:** `app/dashboard/profile/page.tsx` → `components/profile-page.tsx`

**Purpose.** Read-only view of the current session.

**APIs.** None — renders `sessionManager.getUser()` straight from `localStorage`.

**Data displayed.** Email, phone number, role, currency, account status; company name.

---

### `/dashboard/purchase` — Manual ticket purchase

**File:** `app/dashboard/purchase/page.tsx` → `components/purchase-ticket-page.tsx`

**Purpose.** Staff-initiated purchase on behalf of a customer. Not linked from the sidebar.

**APIs**

| Purpose | Client call | Proxy route | Upstream |
| --- | --- | --- | --- |
| Event list | `api.company.getEvents()` | `GET /api/company/events` | `GET /company/events/get` |
| Event tickets | `api.event.getById(eventId)` | `GET /api/event/get` | `GET /event/get?eventId=` |
| Purchase | `api.ticket.purchase(...)` | `POST /api/event/ticket/purchase` | `POST /event/ticket/purchase` |

**Data displayed.** Event picker, ticket type picker with quantities, channel selector
(M-Pesa / card), customer email and phone, optional coupon code, and an order summary with the
computed total.

---

### `/dashboard/payouts` — Payouts

**File:** `app/dashboard/payouts/page.tsx` → `components/payouts-page.tsx`

**Purpose.** Track withdrawal and affiliate-payment requests. Not linked from the sidebar.

**APIs.** **None.** Reads `localStorage["payoutRequests"]` and merges it with a hard-coded
`mockPayouts` array. This page is a prototype.

**Data displayed.** Totals (all / pending / completed amounts, counts by status) and a
filterable list (status, type, search) of request id, type, amount, requester, reviewer, and
timestamps.

---

### `/dashboard/promotions` — Promotions

**File:** `app/dashboard/promotions/page.tsx` → `components/promotions-page.tsx`
**Flag:** hidden from the sidebar (`ENABLE_PROMOTIONS = false`).

**Purpose.** Flash sales and promo codes.

**APIs.** **None** — entirely mock data (`flashSalesData`, `promoCodesData`).

**Data displayed.** Two tabs. *Flash Sales:* name, event, discount %, status, start/end,
tickets used vs limit, revenue. *Promo Codes:* code, event, discount, usage vs limit, expiry,
revenue. Create/edit modals use the shared `DateTimePicker`.

---

### `/dashboard/discover` — Discover

**File:** `app/dashboard/discover/page.tsx` → `components/discover-page.tsx`
**Flag:** hidden from the sidebar (`ENABLE_DISCOVER = false`).

**Purpose.** Static "coming soon" marketing page for nine planned product areas.
**APIs.** None. All content is hard-coded.

---

### `/report` — Report viewer

**File:** `app/report/page.tsx` (+ `app/report/layout.tsx`)

**Purpose.** Renders a pre-built HTML report handed over by the Event Detail page.

**APIs.** None. Reads `sessionStorage["reportHTML"]`, injects it, then clears the key —
so the tab cannot be refreshed or deep-linked. Applies print and mobile stylesheets.

---

### `/test-event-api` — Developer sandbox

**File:** `app/test-event-api/page.tsx`

**Purpose.** Enter an event id and dump the raw `api.event.getById()` response. Development
utility; it sits under the public route tree with no auth guard.

---

## 3. Shared UI

| Component | Role |
| --- | --- |
| `components/side-nav.tsx` | Collapsible desktop sidebar + mobile header/drawer, nav items, profile link, logout |
| `components/ui/date-time-picker.tsx` | `DatePicker`, `TimePicker`, and combined `DateTimePicker` used by create/edit event and promotions |
| `components/theme-provider.tsx` | Light/dark theming |
| `components/event-detail/*` | Modular refactor of the event detail page (hooks, modals, stats, report exporter) |

### DateTimePicker contract

`DateTimePicker` renders a date button and a time button side by side and only reports a value
to the parent once **both** have been chosen — a day picked without a time is held internally
and shows "Now pick a time to complete this field", so a form can never silently submit
midnight. Values arriving from the parent (e.g. an event loaded from the API) are adopted and
treated as complete. Time selection is 12-hour with a full 0–59 minute range.

---

## 4. API route reference

All handlers live under `app/api/**/route.ts`, run on the Node runtime, and inject Basic auth.

| Route | Method | Upstream | Used by |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | `/user/otp/login` | Login, event detail (OTP for sensitive actions) |
| `/api/auth/verify-otp` | POST | server-side pending-login store | Login |
| `/api/user/create` | POST | `/user/create` | Signup, Users |
| `/api/user/edit` | PUT | `/company/user/edit` | Users |
| `/api/user/void` | POST/PUT | `/company/user/suspend` | Users |
| `/api/company/create` | POST | `/company/create` | Signup |
| `/api/company/summary` | GET | `/company/summary` | Dashboard home |
| `/api/company/users` | GET | `/company/fetch/users` | Users |
| `/api/company/events` | GET | `/company/events/get` | Scan, Purchase |
| `/api/admin/events/all` | GET | `/admin/events/get/all` (+ optional per-event `/event/get` enrichment) | Home, Events, Event detail |
| `/api/event/create` | POST | `/event/create` | Create event |
| `/api/event/get` | GET | `/event/get` | Event detail, Edit, Scan, Purchase, sandbox |
| `/api/event/update` | POST | `/event/update` | Edit event |
| `/api/event/status/toggle` | POST | `/event/status/toggle` | Event detail |
| `/api/event/ticket/create` | POST | `/event/ticket/create` | Create event, Event detail |
| `/api/event/ticket/purchase` | POST | `/event/ticket/purchase` | Purchase, Scan (gate sale) |
| `/api/event/issue/complementary` | POST | `/event/issue/complementary` | Event detail |
| `/api/event/attendees`, `/api/gl/event/attendees/list` | GET | `/gl/event/attendees/list` | Event detail |
| `/api/ticket/update` | POST | `/ticket/update` | Edit event, Event detail |
| `/api/ticket/status/toggle` | POST | `/ticket/status/toggle` | Event detail |
| `/api/ticket/group` | GET | `/event/ticket/group/get` | Scan (group code) |
| `/api/affiliates/admin/onboard` | POST | `/affiliates/admin/onboard` | Event detail → Affiliates |
| `/api/affiliates/admin/event` | GET | `/affiliates/admin/event` | Event detail → Affiliates |
| `/api/affiliates/admin/link` | GET | `/affiliates/admin/link` | Event detail → Affiliates |
| `/api/affiliates/adjust/revshare` | GET | `/affiliates/adjust/revshare` | Event detail → Affiliates |
| `/api/affiliates/admin/remove` | DELETE | `/affiliates/admin/remove` | Event detail → Affiliates |
| `/api/scanner/scan` | POST | `/scanner/scan` | Scan |
| `/api/transactions/detailed` | POST | `/gl/transactions/fetch/detailed` | Home, Transactions, Event detail |
| `/api/upload-image` | POST | Contabo S3 | Create event |
| `/api/health` | GET | — | Health probe |
| `/api/test-api` | GET | connectivity probe | Development |
| `/api/tickets/validate`, `/api/tickets/redeem`, `/api/payments/mpesa` | POST | — | Stubs, not wired to any page |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `SOLDOUT_API_USERNAME` / `SOLDOUT_API_PASSWORD` | Basic auth for the upstream API |
| `NEXT_PUBLIC_API_BASE_URL` | Overrides the upstream base in a few routes |
| Contabo S3 credentials | Used by `/api/upload-image` (`eu2.contabostorage.com`) |
| Rate-limit settings | Read by `lib/rate-limiter.ts` (`getRateLimitConfig`) |

---

## 5. Known gaps

- **Payouts** and **Promotions** render mock/`localStorage` data — no backend.
- The **Users → Affiliates** tab and the "Withdraw"/"Report" buttons on the dashboard hero are
  inert (the per-event Affiliates tab is fully wired).
- **Edit event** has no separate end-date field and cannot replace the poster.
- **Transactions** search/filter only apply to the currently loaded page.
- `/test-event-api` is unauthenticated and reachable in production builds.
- Two unmounted alternates exist: `components/event-detail-page-new.tsx` and
  `components/dashboard-home-new.tsx`.
