# Home Inventory — MVP Spec

## Goal
A PWA for one family to track what they own and where it's stored, with emphasis
on surfacing low-use items (seasonal gear, spare parts, tools). Multiple family
members share one household's inventory with view/edit access, and can search
across everything to find an item and its location.

## Scope decisions (confirmed with you)
- **Auth**: Supabase magic link (email OTP). No passwords to manage.
- **Household model**: one household per user for MVP (no multi-household
  switching). A user's `household_members` row is unique per user.
- **Locations**: fixed 4-level hierarchy — `room → unit → shelf → box`. Items
  always attach at the **shelf or box level, never room or unit directly** —
  this keeps "where is it" always answerable at the same granularity, and
  avoids optional/nullable attachment points scattered through the app.
  To keep this painless, creating a `room` auto-creates a "No Unit" child
  unit, and creating a `unit` (including "No Unit") auto-creates a "No Shelf"
  child shelf — so `Room → No Unit → No Shelf` exists the moment you add a
  room, and you can log an item into it immediately without first setting up
  real furniture. `unit` rows have a `unit_type` from a fixed dropdown
  (`wardrobe, cupboard, couch, cabinet, drawer, shelving_unit, chest, desk,
  other`, plus the auto-generated `nounit`) since most storage units are a
  known kind of furniture. **Flag**: this dropdown list is my guess at
  reasonable furniture categories — tell me if you want to add/remove any
  before we build the UI around it.
- **Categories**: custom per household (a household can add/rename its own
  categories), not a hardcoded global list.
- **Tags**: stored as a Postgres `text[]` column on `items` — no separate join
  table for MVP. Simple, and Postgres supports `@>`/`&&` array queries for
  filtering.
- **Retiring items ("one in, one out")**: soft delete via `items.status`
  (`active`/`retired`), not a hard delete. This preserves history and lets the
  activity log reference the retired item afterward.
- **Search**: plain, standard search-box UX for end users (type a word, get
  matches) — no SQL exposed anywhere in the app. Under the hood this is an
  `ILIKE` query the app builds; see "Search & filter" below.
- **Household scope**: this is a single-household, personal-use app for now
  (no active invite flow needed on day one), but we're keeping the
  household/member/invite tables and RLS as designed so adding real family
  members later is just "send an invite link," not a schema migration.

## Entities
- **Household** — a family's shared inventory container.
- **Household member** — a user's membership + role (`owner`/`member`) in a household.
- **Household invite** — pending email invite with a token, redeemed on signup/login.
- **Location** — a node in the room→unit→shelf→box hierarchy.
- **Category** — household-defined grouping for items (e.g. "Seasonal gear", "Tools").
- **Item** — a thing the household owns: name, photo, quantity, location,
  category, tags, last-used date, notes, status.
- **Activity log entry** — audit trail of `added`/`removed`/`moved`/`updated`
  events, so "one in, one out" swaps and moves have a history.

## Schema
See [schema.sql](schema.sql) for the full DDL (tables, constraints, indexes, RLS).
Summary of relationships:

```
households 1---* household_members *---1 auth.users
households 1---* household_invites
households 1---* locations (self-referencing parent_id, level-constrained)
households 1---* categories
households 1---* items ---> locations (nullable FK)
                      ---> categories (nullable FK)
households 1---* activity_log ---> items (nullable FK)
```

## Search & filter (MVP approach)
Standard consumer search UX — a search box plus filter dropdowns, no SQL ever
touches the user:
- Filter by room/location, category, tags (array contains), status (active/retired).
- Text search on `items.name` and `items.description` via `ILIKE`, built by
  the app — good enough for a household-scale dataset (dozens–low hundreds of
  items). We can upgrade to Postgres full-text search (`tsvector` + GIN index)
  later without a schema rewrite if search quality becomes an issue — flagging
  this as a deliberate MVP simplification, not a permanent limitation.

## Row-Level Security (RLS)
Every household-scoped table enforces: a user can only read/write rows whose
`household_id` matches a household they belong to (via `household_members`).
This is the core of Supabase's multi-tenant security model here — no household
data should ever be reachable by a user outside it. Details in schema.sql.

## Decisions closed
1. **Location hierarchy enforcement**: done via a Postgres trigger (not
   app-only) — see `enforce_location_hierarchy` and
   `create_default_child_location` in schema.sql. Items are additionally
   restricted to attaching at shelf/box level via `enforce_item_location_level`.
2. **Invite delivery**: copy-paste link, no transactional email service. The
   `token` column on `household_invites` is what makes the link unguessable.
3. **Photo storage**: compress/resize client-side before upload, as small and
   light as reasonably possible while staying legible — see "Photo handling" below.

## Photo handling (MVP approach)
Client-side compression before upload, using a library like
[`browser-image-compression`](https://www.npmjs.com/package/browser-image-compression)
in the browser (no server-side processing needed). Planned defaults —
flagging these as a starting point, easy to tune once we see real photos:
- Resize so the longest edge is ≤ 1280px (plenty for identifying an item on a
  phone screen; way more would just cost storage for no benefit).
- Re-encode as WebP (or JPEG if we hit browser-support friction) at ~70-75%
  quality.
- Target: most item photos land well under 200KB, so Supabase's 1GB free
  storage tier comfortably holds thousands of items.

## Non-goals for MVP (explicitly deferred)
- Multi-household support per user
- Transactional email for invites
- Full-text search / fuzzy search
- Offline-first conflict resolution (Realtime sync = "last write wins" is fine
  for a family-scale, low-concurrency app)
- Barcode/photo-based item recognition
- Playwright E2E (per your instructions — added after MVP)

## Next steps (pending your sign-off on this doc)
1. You review this spec + schema.sql and flag anything to change.
2. Scaffold repo: Vite + React + TS + Tailwind + shadcn/ui, Supabase client,
   GitHub Actions (lint + typecheck), deploy skeleton to Vercel.
3. Get a genuine end-to-end "hello world" working: magic-link auth +
   reading one table from Supabase, deployed on Vercel — before any feature work.
4. Build features incrementally per your plan: household creation/invite →
   locations → items CRUD → photo upload → one-in-one-out log → search/filter.
